import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';

export const GET: APIRoute = async ({ request }) => {
  const cors = corsHeaders(request);

  if (!supabase) {
    return json({ error: 'Database not configured' }, 503, cors);
  }

  // Use RPC to get global leaderboard (best score per agent per puzzle, summed)
  const { data, error } = await supabase.rpc('leaderboard_global', { p_limit: 100 });

  if (error) {
    return json({ error: 'Query failed' }, 500, cors);
  }

  const entries = (data ?? []).map((row: {
    agent_name: string;
    total_score: number;
    puzzles_solved: number;
    best_model: string | null;
  }, i: number) => ({
    rank: i + 1,
    agent_name: row.agent_name,
    model: row.best_model,
    total_score: Math.round(row.total_score),
    puzzles_solved: row.puzzles_solved,
  }));

  return json({ entries }, 200, {
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
