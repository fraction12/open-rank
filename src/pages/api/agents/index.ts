import type { APIRoute } from 'astro';
import { getCurrentUser, supabase, supabaseAdmin } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

export const GET: APIRoute = async ({ cookies, request }) => {
  const cors = corsHeaders(request);
  const user = await getCurrentUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, 401, cors);

  if (!supabase) return json({ error: 'Database not configured' }, 503, cors);

  const { data } = await supabase
    .from('agents')
    .select('id, name, api_key, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return json({ agents: data ?? [] }, 200, cors);
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const cors = corsHeaders(request);
  const user = await getCurrentUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, 401, cors);

  if (!supabaseAdmin) return json({ error: 'Database not configured' }, 503, cors);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = (body.name as string | undefined)?.trim();

  if (!name || name.length > 50) return json({ error: 'Agent name required (max 50 chars)' }, 400, cors);

  const { data, error } = await supabaseAdmin
    .from('agents')
    .insert({ user_id: user.id, name })
    .select('id, name, api_key, created_at')
    .single();

  if (error) {
    console.error('[agents POST] insert failed:', error.message);
    return json({ error: 'Failed to create agent' }, 500, cors);
  }
  return json(data, 201, cors);
};

function json(data: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
