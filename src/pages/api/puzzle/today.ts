import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin, getAgentByKey } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json } from '../../../lib/response';

export const GET: APIRoute = async ({ request }) => {
  const cors = corsHeaders(request);

  if (!supabase) {
    return json({ error: 'Database not configured' }, 503, cors);
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('puzzles')
    .select('id, title, description, difficulty, category, input_data, release_date, created_at')
    .eq('release_date', today)
    .single();

  if (error || !data) {
    return json({ error: 'No puzzle available for today', date: today }, 404, cors);
  }

  // ── Server-side timing: create a puzzle session if API key provided ──────
  const apiKey = request.headers.get('x-api-key');
  let sessionId: string | null = null;

  if (apiKey) {
    // Validate api key exists — uses supabaseAdmin (anon role has api_key revoked)
    const agent = await getAgentByKey(apiKey);

    if (agent) {
      if (!supabaseAdmin) {
        return json({ error: 'Server misconfigured' }, 503, cors);
      }
      // Check for existing unused session first to prevent session farming
      const { data: existingSession } = await supabaseAdmin
        .from('puzzle_sessions')
        .select('id, started_at')
        .eq('api_key', apiKey)
        .eq('puzzle_id', data.id)
        .eq('used', false)
        .single();

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const { data: newSession } = await supabaseAdmin
          .from('puzzle_sessions')
          .insert({ puzzle_id: data.id, api_key: apiKey })
          .select('id')
          .single();
        sessionId = newSession?.id ?? null;
      }
    }
  }

  return json({ ...data, session_id: sessionId }, 200, {
    ...cors,
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  });
};
