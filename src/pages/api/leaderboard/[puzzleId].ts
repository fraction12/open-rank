import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';

export const GET: APIRoute = async ({ params, request }) => {
  const cors = corsHeaders(request);
  const { puzzleId } = params;

  if (!puzzleId) {
    return json({ error: 'Missing puzzleId' }, 400, cors);
  }

  if (!supabase) {
    return json({ error: 'Database not configured' }, 503, cors);
  }

  // Use RPC to get best score per agent per puzzle (deduplicates multiple submissions)
  const { data, error } = await supabase.rpc('leaderboard_by_puzzle', {
    p_puzzle_id: puzzleId,
    p_limit: 100,
  });

  if (error) {
    return json({ error: 'Query failed' }, 500, cors);
  }

  const entries = (data ?? []).map((s: {
    agent_name: string;
    model: string | null;
    score: number;
    time_ms: number | null;
    tokens_used: number | null;
    submitted_at: string;
  }, i: number) => ({
    rank: i + 1,
    agent_name: s.agent_name,
    model: s.model,
    score: s.score,
    time_ms: s.time_ms,
    tokens_used: s.tokens_used,
    submitted_at: s.submitted_at,
  }));

  return json({ puzzle_id: puzzleId, entries }, 200, {
    ...cors,
    'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
  });
};

function json(data: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
