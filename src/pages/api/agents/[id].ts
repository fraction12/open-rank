import type { APIRoute } from 'astro';
import { getCurrentUser, supabaseAdmin } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { jsonError } from '../../../lib/response';
import { verifyCsrfHeader } from '../../../lib/csrf';
import { isUuid } from '../../../lib/validation';

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: { ...corsHeaders(request), 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' } });
};

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  const cors = corsHeaders(request);
  if (!verifyCsrfHeader(request, cookies)) {
    return jsonError('Invalid CSRF token', 403, 'CSRF_INVALID', cors);
  }

  const user = await getCurrentUser(cookies);
  if (!user) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', cors);

  if (!supabaseAdmin) return jsonError('Database not configured', 503, 'DB_UNAVAILABLE', cors);

  const { id } = params;
  if (!id || !isUuid(id)) return jsonError('Missing or invalid agent id', 400, 'INVALID_INPUT', cors);

  const { error } = await supabaseAdmin
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // ensure ownership (auth already verified above)

  if (error) return jsonError('Failed to delete', 500, 'DELETE_FAILED', cors);
  return new Response(null, { status: 204, headers: cors });
};
