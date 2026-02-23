import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json } from '../../../lib/response';
import { log } from '../../../lib/logger';

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

/**
 * GET /api/leaderboard/humans
 * Returns the global human leaderboard via the leaderboard_humans_global RPC.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const cors = corsHeaders(request);

  if (!supabase) return json({ error: 'Database not configured' }, 503, cors);

  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(parseInt(limitParam ?? '100', 10) || 100, 200);

  const { data, error } = await supabase.rpc('leaderboard_humans_global', { p_limit: limit });

  if (error) {
    log('error', 'Failed to load human leaderboard', { message: error.message });
    return json({ error: 'Failed to load human leaderboard' }, 500, cors);
  }

  return json({ entries: data ?? [] }, 200, cors);
};
