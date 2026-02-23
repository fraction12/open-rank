import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json } from '../../../lib/response';

const VALID_CATEGORIES = [
  'data_analysis', 'coding', 'cipher_reasoning', 'multi_step',
  'code_review', 'long_context', 'web_research', 'agentic_engineering',
] as const;
type PuzzleCategory = typeof VALID_CATEGORIES[number];

export const GET: APIRoute = async ({ request }) => {
  const cors = corsHeaders(request);

  if (!supabase) {
    return json({ error: 'Database not configured' }, 503, cors);
  }

  const url = new URL(request.url);
  const categoryParam = url.searchParams.get('category');

  // Validate category param if provided
  const category = (VALID_CATEGORIES as readonly string[]).includes(categoryParam ?? '')
    ? (categoryParam as PuzzleCategory)
    : null;

  let entries;

  if (category) {
    // Per-category leaderboard via RPC
    const { data, error } = await supabase.rpc('leaderboard_by_category', {
      p_category: category,
      p_limit: 100,
    });

    if (error) {
      return json({ error: 'Query failed' }, 500, cors);
    }

    entries = (data ?? []).map((row: {
      rank: number;
      github_login: string | null;
      agent_name: string;
      model: string | null;
      total_score: number;
      puzzles_solved: number;
      avg_time_ms: number | null;
      avg_tokens: number | null;
    }) => ({
      rank: Number(row.rank),
      github_login: row.github_login ?? null,
      agent_name: row.agent_name,
      model: row.model,
      total_score: Math.round(Number(row.total_score)),
      puzzles_solved: Number(row.puzzles_solved),
      avg_time_ms: row.avg_time_ms ? Math.round(Number(row.avg_time_ms)) : null,
      avg_tokens: row.avg_tokens ? Math.round(Number(row.avg_tokens)) : null,
    }));
  } else {
    // Global leaderboard via RPC
    const { data, error } = await supabase.rpc('leaderboard_global', { p_limit: 100 });

    if (error) {
      return json({ error: 'Query failed' }, 500, cors);
    }

    entries = (data ?? []).map((row: {
      github_login: string | null;
      agent_name: string;
      total_score: number;
      puzzles_solved: number;
      model: string | null;
      avg_time_ms: number | null;
      avg_tokens: number | null;
    }, i: number) => ({
      rank: i + 1,
      github_login: row.github_login ?? null,
      agent_name: row.agent_name,
      model: row.model,
      total_score: Math.round(row.total_score),
      puzzles_solved: row.puzzles_solved,
      avg_time_ms: row.avg_time_ms ? Math.round(row.avg_time_ms) : null,
      avg_tokens: row.avg_tokens ? Math.round(row.avg_tokens) : null,
    }));
  }

  return json({ entries }, 200, {
    ...cors,
    'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
  });
};
