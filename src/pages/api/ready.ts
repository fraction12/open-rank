import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { hasRequiredEnv, missingRequiredEnv } from '../../lib/env';
import { json } from '../../lib/response';

export const GET: APIRoute = async ({ locals }) => {
  if (!hasRequiredEnv()) {
    return json({
      status: 'not_ready',
      reason: 'env_missing',
      missing: missingRequiredEnv(),
      request_id: locals.requestId ?? null,
    }, 503);
  }

  if (!supabaseAdmin) {
    return json({
      status: 'not_ready',
      reason: 'db_not_configured',
      request_id: locals.requestId ?? null,
    }, 503);
  }

  const { error } = await supabaseAdmin
    .from('puzzles')
    .select('id')
    .limit(1);

  if (error) {
    return json({
      status: 'not_ready',
      reason: 'db_unreachable',
      request_id: locals.requestId ?? null,
    }, 503);
  }

  return json({
    status: 'ready',
    request_id: locals.requestId ?? null,
  });
};
