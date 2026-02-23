import type { APIRoute } from 'astro';
import { supabaseAdmin, getAgentByKey, getCurrentUser } from '../../lib/supabase';
import { saltedHash } from '../../lib/hash';
import { computeSpeedBonus, computeEfficiencyBonus, computeHumanEfficiencyBonus } from '../../lib/scoring';
import { checkRateLimit } from '../../lib/rate-limit';
import { corsHeaders } from '../../lib/cors';
import { json } from '../../lib/response';
import { log } from '../../lib/logger';

// ── OPTIONS preflight (CORS) ─────────────────────────────────────────────────
export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const cors = corsHeaders(request);

  // ── Parse body ──────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, cors);
  }

  // ── Extract fields ───────────────────────────────────────
  const {
    puzzle_id,
    answer,
    agent_name: rawAgentName,
    api_key,
    session_id,
    model,
    time_ms: selfReportedTimeMs,
    tokens_used,
    skill_used,
  } = body as {
    puzzle_id?: string;
    answer?: string;
    agent_name?: string;
    api_key?: string;
    session_id?: string;
    model?: string;
    time_ms?: number;
    tokens_used?: number;
    skill_used?: string;
  };

  // ── Human challenge fields ───────────────────────────────
  // NOTE: is_human is derived server-side (M6 fix) — not trusted from client.
  // We determine it after we know userId and puzzleId.
  const ai_tool = typeof body.ai_tool === 'string' ? (body.ai_tool as string).slice(0, 100) : null;

  // ── Validate required fields ─────────────────────────────
  if (!puzzle_id || typeof puzzle_id !== 'string') return json({ error: 'puzzle_id is required' }, 400, cors);
  if (!answer   || typeof answer   !== 'string') return json({ error: 'answer is required' }, 400, cors);

  // ── Guard: supabaseAdmin must be available for all writes ─
  if (!supabaseAdmin) return json({ error: 'Database not configured' }, 503, cors);

  // ── Human challenge path ─────────────────────────────────
  // M6 fix: Derive is_human server-side — do NOT trust the client-supplied flag.
  // If there's no api_key, check if the user has a valid GitHub-authenticated session
  // with a puzzle_sessions row where is_human=true for this user+puzzle.
  let is_human = false;
  let humanUserId: string | null = null;
  let humanAttemptNumber: number | null = null;

  const apiKey = api_key && typeof api_key === 'string' ? api_key : null;

  if (!apiKey) {
    // Try to get current GitHub-authenticated user
    const currentUser = await getCurrentUser(cookies);
    if (currentUser) {
      // Check if a human session exists for this user+puzzle
      // Human sessions: user_id is set + api_key is null (created via start-challenge)
      const { data: humanSession } = await supabaseAdmin
        .from('puzzle_sessions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('puzzle_id', puzzle_id)
        .is('api_key', null)
        .maybeSingle();

      if (humanSession) {
        is_human = true;
        humanUserId = currentUser.id;
      }
    }
  }

  if (is_human && humanUserId) {
    // C1: Prevent duplicate correct human submissions (score farming)
    // Check for an existing correct submission before counting attempts
    const { data: existingCorrect } = await supabaseAdmin
      .from('submissions')
      .select('score, submitted_at')
      .eq('user_id', humanUserId)
      .eq('puzzle_id', puzzle_id)
      .eq('is_human', true)
      .eq('correct', true)
      .maybeSingle();

    if (existingCorrect) {
      return json({ correct: true, score: existingCorrect.score, duplicate: true }, 200, cors);
    }

    // Count previous submissions for this user+puzzle to determine attempt number
    const { count: prevCount } = await supabaseAdmin
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('puzzle_id', puzzle_id)
      .eq('user_id', humanUserId)
      .eq('is_human', true);

    humanAttemptNumber = (prevCount ?? 0) + 1;
  }

  // ── Resolve agent identity ───────────────────────────────
  // api_key present → ranked submission; absent → practice mode
  let agentId: string | null = null;
  let agentName: string = 'anonymous';
  let isPractice = true;

  if (is_human) {
    // Human submissions: not an agent, treat as a special ranked human mode
    agentName = 'human';
    isPractice = false;
  } else if (api_key && typeof api_key === 'string') {
    const agent = await getAgentByKey(api_key);
    if (!agent) return json({ error: 'Invalid API key' }, 401, cors);
    agentId = agent.id;
    agentName = agent.name;
    isPractice = false;
  } else if (rawAgentName && typeof rawAgentName === 'string') {
    // Legacy: allow agent_name without api_key for practice mode
    if (rawAgentName.length > 50) return json({ error: 'agent_name must be 50 characters or less' }, 400, cors);
    if (!/^[\w\s\-\.\/:]+$/i.test(rawAgentName)) return json({ error: 'agent_name contains invalid characters' }, 400, cors);
    agentName = rawAgentName.trim();
    isPractice = true; // no api_key = always practice
  }

  // ── Validate other inputs ────────────────────────────────
  if (model && model.length > 100) return json({ error: 'model must be 100 characters or less' }, 400, cors);
  if (selfReportedTimeMs !== undefined && (typeof selfReportedTimeMs !== 'number' || selfReportedTimeMs < 0 || selfReportedTimeMs > 86400000))
    return json({ error: 'time_ms must be 0–86400000' }, 400, cors);
  if (tokens_used !== undefined && (typeof tokens_used !== 'number' || tokens_used < 0 || tokens_used > 10000000))
    return json({ error: 'tokens_used must be 0–10000000' }, 400, cors);
  if (skill_used && typeof skill_used !== 'string')
    return json({ error: 'skill_used must be a string' }, 400, cors);
  if (skill_used && skill_used.length > 100)
    return json({ error: 'skill_used too long (max 100 chars)' }, 400, cors);

  // ── Rate limiting ────────────────────────────────────────
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';

  const rlKey = `${ip}:${puzzle_id}`;
  const rl = await checkRateLimit(rlKey, 10, 60 * 60 * 1000); // 10 per hour per puzzle per IP
  if (!rl.allowed) {
    return json(
      { error: 'Rate limit exceeded. Try again later.', retry_after: rl.retryAfter },
      429,
      cors,
    );
  }

  // ── Load puzzle (only fields needed for verification) ────
  // Use supabaseAdmin — anon SELECT on puzzles is revoked (H2/H5 fix)
  const today = new Date().toISOString().split('T')[0];
  const { data: puzzle, error: pErr } = await supabaseAdmin
    .from('puzzles')
    .select('id, answer_hash')
    .eq('id', puzzle_id)
    .lte('release_date', today)
    .single();

  if (pErr || !puzzle) return json({ error: 'Puzzle not found or not yet released' }, 404, cors);

  // ── Server-side timing: look up session ──────────────────
  // puzzle_sessions is now locked to service role — must use supabaseAdmin
  let realTimeMs: number | null = null;

  if (session_id && typeof session_id === 'string') {
    if (is_human && humanUserId) {
      // Human session: scoped to user_id (not api_key)
      const { data: session } = await supabaseAdmin
        .from('puzzle_sessions')
        .update({ used: true })
        .eq('id', session_id)
        .eq('used', false)
        .eq('puzzle_id', puzzle_id)
        .eq('user_id', humanUserId)
        .select('started_at')
        .single();

      if (session) {
        realTimeMs = Date.now() - new Date(session.started_at).getTime();
      }
    } else if (api_key && typeof api_key === 'string') {
      // Atomic UPDATE: only succeeds if session is unused, matches puzzle, and belongs to this api_key
      // Combines H2 (session scoping) + H3 (TOCTOU-safe atomic update)
      const { data: session } = await supabaseAdmin
        .from('puzzle_sessions')
        .update({ used: true })
        .eq('id', session_id)
        .eq('used', false)
        .eq('puzzle_id', puzzle_id)
        .eq('api_key', api_key)
        .select('started_at')
        .single();

      if (session) {
        realTimeMs = Date.now() - new Date(session.started_at).getTime();
      }
    }
  }

  // ── Check correctness ─────────────────────────────────────
  const answerHash = await saltedHash(answer.trim(), puzzle_id);
  const correct = answerHash === puzzle.answer_hash;

  // ── Get current bests for this puzzle (speed + efficiency) ──
  // Only compare against ranked (non-practice) submissions
  // submissions is now locked — must use supabaseAdmin
  let bestTimeMs: number | null = null;
  let bestTokens: number | null = null;

  if (correct) {
    const { data: bestSubs } = await supabaseAdmin
      .from('submissions')
      .select('time_ms, tokens_used')
      .eq('puzzle_id', puzzle_id)
      .eq('correct', true)
      .eq('is_practice', false)
      .not('time_ms', 'is', null)
      .order('time_ms', { ascending: true })
      .limit(1);

    if (bestSubs && bestSubs.length > 0) {
      bestTimeMs  = bestSubs[0].time_ms;
      bestTokens  = bestSubs[0].tokens_used;
    }
  }

  // ── Calculate score ───────────────────────────────────────
  // NOTE: Speed and efficiency bonuses are calculated relative to the current best
  // at submission time. Scores are NOT retroactively updated when faster/leaner
  // submissions arrive later. First correct submitters get max bonus by definition.
  // This is a known tradeoff — simplicity over perfect fairness.
  // Future: consider a nightly score recalculation job.
  //
  // Use server-measured time if available, otherwise self-reported (for practice)
  const timeForScoring = realTimeMs ?? (isPractice ? selfReportedTimeMs : null);

  const correctness = correct ? 50 : 0;
  const speed_bonus = correct ? computeSpeedBonus(timeForScoring, bestTimeMs) : 0;
  // Human submissions: efficiency based on attempt number; agent submissions: based on tokens
  const efficiency_bonus = correct
    ? (is_human ? computeHumanEfficiencyBonus(humanAttemptNumber) : computeEfficiencyBonus(tokens_used, bestTokens))
    : 0;
  const score = correctness + speed_bonus + efficiency_bonus;

  // ── Insert submission (via service role — RLS locked down) ────────────────
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('submissions')
    .insert({
      puzzle_id,
      agent_name: agentName,
      agent_id: agentId,
      model: model?.trim() ?? null,
      answer_hash: answerHash,
      correct,
      score,
      time_ms: realTimeMs ?? (isPractice ? selfReportedTimeMs ?? null : null),
      tokens_used: tokens_used ?? null,
      is_practice: isPractice,
      session_id: session_id ?? null,
      skill_used: (skill_used as string | undefined)?.trim() ?? null,
      // Human challenge fields
      is_human: is_human,
      ai_tool: ai_tool ?? null,
      attempt_number: is_human ? humanAttemptNumber : null,
      user_id: is_human ? humanUserId : null,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    if (insErr?.code === '23505' && is_human && humanUserId && correct) {
      const { data: existingCorrect } = await supabaseAdmin
        .from('submissions')
        .select('score')
        .eq('user_id', humanUserId)
        .eq('puzzle_id', puzzle_id)
        .eq('is_human', true)
        .eq('correct', true)
        .maybeSingle();

      if (existingCorrect) {
        return json({ correct: true, score: existingCorrect.score, duplicate: true }, 200, cors);
      }
    }

    log('error', 'Failed to record submission', { message: insErr?.message });
    return json({ error: 'Failed to record submission' }, 500, cors);
  }

  // ── Calculate rank (only among ranked submissions) ────────
  let rank: number | null = null;
  if (!isPractice && correct) {
    if (is_human && humanUserId) {
      const { data: humanRows } = await supabaseAdmin
        .from('submissions')
        .select('user_id, score, time_ms')
        .eq('puzzle_id', puzzle_id)
        .eq('is_human', true)
        .eq('correct', true)
        .not('user_id', 'is', null);

      if (humanRows) {
        const bestByUser = new Map<string, { score: number; time_ms: number | null }>();
        for (const row of humanRows) {
          const userId = row.user_id as string | null;
          if (!userId) continue;
          const prev = bestByUser.get(userId);
          if (!prev || row.score > prev.score || (row.score === prev.score && (row.time_ms ?? Number.MAX_SAFE_INTEGER) < (prev.time_ms ?? Number.MAX_SAFE_INTEGER))) {
            bestByUser.set(userId, { score: row.score, time_ms: row.time_ms });
          }
        }
        const sorted = Array.from(bestByUser.entries()).sort((a, b) => {
          if (b[1].score !== a[1].score) return b[1].score - a[1].score;
          return (a[1].time_ms ?? Number.MAX_SAFE_INTEGER) - (b[1].time_ms ?? Number.MAX_SAFE_INTEGER);
        });
        const index = sorted.findIndex(([userId]) => userId === humanUserId);
        rank = index >= 0 ? index + 1 : null;
      }
    } else {
      const { data: aiRows } = await supabaseAdmin
        .from('submissions')
        .select('agent_name, score, time_ms')
        .eq('puzzle_id', puzzle_id)
        .eq('is_practice', false)
        .eq('correct', true)
        .or('is_human.is.null,is_human.eq.false');

      if (aiRows) {
        const bestByAgent = new Map<string, { score: number; time_ms: number | null }>();
        for (const row of aiRows) {
          const prev = bestByAgent.get(row.agent_name);
          if (!prev || row.score > prev.score || (row.score === prev.score && (row.time_ms ?? Number.MAX_SAFE_INTEGER) < (prev.time_ms ?? Number.MAX_SAFE_INTEGER))) {
            bestByAgent.set(row.agent_name, { score: row.score, time_ms: row.time_ms });
          }
        }
        const sorted = Array.from(bestByAgent.entries()).sort((a, b) => {
          if (b[1].score !== a[1].score) return b[1].score - a[1].score;
          return (a[1].time_ms ?? Number.MAX_SAFE_INTEGER) - (b[1].time_ms ?? Number.MAX_SAFE_INTEGER);
        });
        const index = sorted.findIndex(([name]) => name === agentName);
        rank = index >= 0 ? index + 1 : null;
      }
    }
  }

  return json(
    {
      correct,
      score,
      rank,
      is_practice: isPractice,
      time_ms: realTimeMs,
      skill_used: skill_used ?? null,
      breakdown: { correctness, speed_bonus, efficiency_bonus },
    },
    200,
    cors,
  );
};
