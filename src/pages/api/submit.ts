import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
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

  // ── Validate required fields ─────────────────────────────
  const { puzzle_id, answer, agent_name, model, time_ms, tokens_used } = body as {
    puzzle_id?: string;
    answer?: string;
    agent_name?: string;
    model?: string;
    time_ms?: number;
    tokens_used?: number;
  };

  if (!puzzle_id || typeof puzzle_id !== 'string') return json({ error: 'puzzle_id is required' }, 400, cors);
  if (!answer   || typeof answer   !== 'string') return json({ error: 'answer is required' }, 400, cors);
  if (!agent_name || typeof agent_name !== 'string') return json({ error: 'agent_name is required' }, 400, cors);

  // ── Sanitize / validate inputs ───────────────────────────
  if (agent_name.length > 50) return json({ error: 'agent_name must be 50 characters or less' }, 400, cors);
  if (model && model.length > 100) return json({ error: 'model must be 100 characters or less' }, 400, cors);
  if (!/^[\w\s\-\.\/:]+$/i.test(agent_name)) return json({ error: 'agent_name contains invalid characters' }, 400, cors);
  if (time_ms !== undefined && (typeof time_ms !== 'number' || time_ms < 0 || time_ms > 86400000))
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

  // ── Check correctness ─────────────────────────────────────
  const answerHash = await saltedHash(answer.trim(), puzzle_id);
  const correct = answerHash === puzzle.answer_hash;

  // ── Get current bests for this puzzle (speed + efficiency) ──
  let bestTimeMs: number | null = null;
  let bestTokens: number | null = null;

  if (correct) {
    const { data: bestSubs } = await supabase
      .from('submissions')
      .select('time_ms, tokens_used')
      .eq('puzzle_id', puzzle_id)
      .eq('correct', true)
      .order('time_ms', { ascending: true })
      .limit(1);

    if (bestSubs && bestSubs.length > 0) {
      bestTimeMs  = bestSubs[0].time_ms;
      bestTokens  = bestSubs[0].tokens_used;
    }
  }

  // ── Calculate score ───────────────────────────────────────
  const correctness = correct ? 50 : 0;
  const speed_bonus = correct ? computeSpeedBonus(time_ms, bestTimeMs) : 0;
  const efficiency_bonus = correct ? computeEfficiencyBonus(tokens_used, bestTokens) : 0;
  const score = correctness + speed_bonus + efficiency_bonus;

  // ── Insert submission ─────────────────────────────────────
  const { data: inserted, error: insErr } = await supabase
    .from('submissions')
    .insert({
      puzzle_id,
      agent_name: agent_name.trim(),
      model: model?.trim() ?? null,
      answer_hash: answerHash,
      correct,
      score,
      time_ms: time_ms ?? null,
      tokens_used: tokens_used ?? null,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    console.error('Insert error:', insErr);
    return json({ error: 'Failed to record submission' }, 500, cors);
  }

  // ── Calculate rank ────────────────────────────────────────
  const { count } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('puzzle_id', puzzle_id)
    .gte('score', score);

  const rank = count ?? 1;

  return json(
    { correct, score, rank, breakdown: { correctness, speed_bonus, efficiency_bonus } },
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
