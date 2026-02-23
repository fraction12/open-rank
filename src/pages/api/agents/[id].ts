import type { APIRoute } from 'astro';
import { getCurrentUser, supabaseAdmin } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: { ...corsHeaders(request), 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' } });
};

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  const cors = corsHeaders(request);
  const user = await getCurrentUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });

  if (!supabaseAdmin) return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503, headers: { 'Content-Type': 'application/json', ...cors } });

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing agent id' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });

  const { error } = await supabaseAdmin
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // ensure ownership (auth already verified above)

  if (error) return new Response(JSON.stringify({ error: 'Failed to delete' }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } });
  return new Response(null, { status: 204, headers: cors });
};
