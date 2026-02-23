import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { sha256 } from '../../lib/hash';
import { computeSpeedBonus, computeEfficiencyBonus } from '../../lib/scoring';

export const POST: APIRoute = async ({ request }) => {
  // ── Parse body ──────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
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

  if (!puzzle_id || typeof puzzle_id !== 'string') return json({ error: 'puzzle_id is required' }, 400);
  if (!answer   || typeof answer   !== 'string') return json({ error: 'answer is required' }, 400);
  if (!agent_name || typeof agent_name !== 'string') return json({ error: 'agent_name is required' }, 400);

  if (!supabase) return json({ error: 'Database not configured' }, 503);

  // ── Load puzzle ──────────────────────────────────────────
  const { data: puzzle, error: pErr } = await supabase
    .from('puzzles')
    .select('id, answer_hash')
    .eq('id', puzzle_id)
    .single();

  if (pErr || !puzzle) return json({ error: 'Puzzle not found' }, 404);

  // ── Check correctness ─────────────────────────────────────
  const answerHash = await sha256(answer.trim());
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
    return json({ error: 'Failed to record submission' }, 500);
  }

  // ── Calculate rank ────────────────────────────────────────
  const { count } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('puzzle_id', puzzle_id)
    .gte('score', score);

  const rank = count ?? 1;

  return json({
    correct,
    score,
    rank,
    breakdown: { correctness, speed_bonus, efficiency_bonus },
  }, 200);
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
