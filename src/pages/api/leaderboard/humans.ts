import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json, jsonError } from '../../../lib/response';
import { log } from '../../../lib/logger';
import { parsePositiveInt } from '../../../lib/validation';

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

/**
 * GET /api/leaderboard/humans
 * Returns the global human leaderboard via the leaderboard_humans_global RPC.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const cors = corsHeaders(request);

  if (!supabase) return jsonError('Database not configured', 503, 'DB_UNAVAILABLE', cors);

  const limit = parsePositiveInt(url.searchParams.get('limit'), 100, 1, 200);
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 1, 1000);
  const offset = (page - 1) * limit;

  const { data, error } = await supabase.rpc('leaderboard_humans_global', {
    p_limit: Math.min(1000, offset + limit),
  });

  if (error) {
    log('error', 'Failed to load human leaderboard', { message: error.message });
    return jsonError('Failed to load human leaderboard', 500, 'QUERY_FAILED', cors);
  }

  return json({ entries: (data ?? []).slice(offset, offset + limit), page, limit }, 200, cors);
};
