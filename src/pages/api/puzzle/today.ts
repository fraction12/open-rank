import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';

export const GET: APIRoute = async ({ request }) => {
  const cors = corsHeaders(request);

  if (!supabase) {
    return json({ error: 'Database not configured' }, 503, cors);
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('puzzles')
    .select('id, title, description, difficulty, input_data, release_date, created_at')
    .eq('release_date', today)
    .single();

  if (error || !data) {
    return json({ error: 'No puzzle available for today', date: today }, 404, cors);
  }

  // ── Server-side timing: create a puzzle session if API key provided ──────
  const apiKey = request.headers.get('x-api-key');
  let sessionId: string | null = null;

  if (apiKey) {
    // Validate api key exists
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (agent) {
      const { data: session } = await supabaseAdmin!
        .from('puzzle_sessions')
        .insert({ puzzle_id: data.id, api_key: apiKey })
        .select('id')
        .single();
      sessionId = session?.id ?? null;
    }
  }

  return json({ ...data, session_id: sessionId }, 200, {
    ...cors,
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  });
};

function json(data: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
