import type { APIRoute } from 'astro';
import { supabase, getAgentByKey } from '../../lib/supabase';
import { saltedHash } from '../../lib/hash';
import { computeSpeedBonus, computeEfficiencyBonus } from '../../lib/scoring';
import { checkRateLimit } from '../../lib/rate-limit';
import { corsHeaders } from '../../lib/cors';

// ── OPTIONS preflight (CORS) ─────────────────────────────────────────────────
export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

export const POST: APIRoute = async ({ request }) => {
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

  // ── Validate required fields ─────────────────────────────
  if (!puzzle_id || typeof puzzle_id !== 'string') return json({ error: 'puzzle_id is required' }, 400, cors);
  if (!answer   || typeof answer   !== 'string') return json({ error: 'answer is required' }, 400, cors);

  // ── Resolve agent identity ───────────────────────────────
  // api_key present → ranked submission; absent → practice mode
  let agentId: string | null = null;
  let agentName: string = 'anonymous';
  let isPractice = true;

  if (api_key && typeof api_key === 'string') {
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

  if (!supabase) return json({ error: 'Database not configured' }, 503, cors);

  // ── Load puzzle (only fields needed for verification) ────
  const { data: puzzle, error: pErr } = await supabase
    .from('puzzles')
    .select('id, answer_hash')
    .eq('id', puzzle_id)
    .single();

  if (pErr || !puzzle) return json({ error: 'Puzzle not found' }, 404, cors);

  // ── Server-side timing: look up session ──────────────────
  let realTimeMs: number | null = null;

  if (session_id && typeof session_id === 'string' && api_key && typeof api_key === 'string') {
    // Atomic UPDATE: only succeeds if session is unused, matches puzzle, and belongs to this api_key
    // Combines H2 (session scoping) + H3 (TOCTOU-safe atomic update)
    const { data: session } = await supabase
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

  // ── Check correctness ─────────────────────────────────────
  const answerHash = await saltedHash(answer.trim(), puzzle_id);
  const correct = answerHash === puzzle.answer_hash;

  // ── Get current bests for this puzzle (speed + efficiency) ──
  // Only compare against ranked (non-practice) submissions
  let bestTimeMs: number | null = null;
  let bestTokens: number | null = null;

  if (correct) {
    const { data: bestSubs } = await supabase
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
  // Use server-measured time if available, otherwise self-reported (for practice)
  const timeForScoring = realTimeMs ?? (isPractice ? selfReportedTimeMs : null);

  const correctness = correct ? 50 : 0;
  const speed_bonus = correct ? computeSpeedBonus(timeForScoring, bestTimeMs) : 0;
  const efficiency_bonus = correct ? computeEfficiencyBonus(tokens_used, bestTokens) : 0;
  const score = correctness + speed_bonus + efficiency_bonus;

  // ── Insert submission ─────────────────────────────────────
  const { data: inserted, error: insErr } = await supabase
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
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    console.error('Insert error:', insErr);
    return json({ error: 'Failed to record submission' }, 500, cors);
  }

  // ── Calculate rank (only among ranked submissions) ────────
  let rank: number = 1;
  if (!isPractice) {
    const { count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('puzzle_id', puzzle_id)
      .eq('is_practice', false)
      .gte('score', score);

    rank = count ?? 1;
  }

  return json(
    {
      correct,
      score,
      rank: isPractice ? null : rank,
      is_practice: isPractice,
      time_ms: realTimeMs,
      breakdown: { correctness, speed_bonus, efficiency_bonus },
    },
    200,
    cors,
  );
};

function json(data: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
