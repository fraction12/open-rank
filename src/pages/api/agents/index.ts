import type { APIRoute } from 'astro';
import { getCurrentUser, supabaseAdmin } from '../../../lib/supabase';
import { checkRateLimit } from '../../../lib/rate-limit';
import { corsHeaders } from '../../../lib/cors';
import { json } from '../../../lib/response';

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

export const GET: APIRoute = async ({ cookies, request }) => {
  const cors = corsHeaders(request);
  const user = await getCurrentUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, 401, cors);

  if (!supabaseAdmin) return json({ error: 'Database not configured' }, 503, cors);

  // Use admin client so api_key is readable server-side (anon role has api_key revoked)
  const { data } = await supabaseAdmin
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

  // Rate limit: 5 agent creations per user per hour
  const rl = await checkRateLimit(`agent_create:${user.id}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return json({ error: 'Too many agents created. Try again later.' }, 429, cors);
  }

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
