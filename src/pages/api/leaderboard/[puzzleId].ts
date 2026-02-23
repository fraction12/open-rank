import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json, jsonError } from '../../../lib/response';
import { isUuid, parsePositiveInt } from '../../../lib/validation';

export const GET: APIRoute = async ({ params, request }) => {
  const cors = corsHeaders(request);
  const { puzzleId } = params;

  if (!puzzleId || !isUuid(puzzleId)) {
    return jsonError('Missing or invalid puzzleId', 400, 'INVALID_INPUT', cors);
  }

  if (!supabase) {
    return jsonError('Database not configured', 503, 'DB_UNAVAILABLE', cors);
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get('limit'), 100, 1, 200);
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 1, 1000);
  const offset = (page - 1) * limit;

  // Use RPC to get best score per agent per puzzle (deduplicates multiple submissions)
  const { data, error } = await supabase.rpc('leaderboard_by_puzzle', {
    p_puzzle_id: puzzleId,
    p_limit: Math.min(1000, offset + limit),
  });

  if (error) {
    return jsonError('Query failed', 500, 'QUERY_FAILED', cors);
  }

  const entries = (data ?? []).slice(offset, offset + limit).map((s: {
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

  return json({ puzzle_id: puzzleId, entries, page, limit }, 200, {
    ...cors,
    'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
  });
};
