import type { APIRoute } from 'astro';
import { supabaseAdmin, getAgentByKey } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json, jsonError } from '../../../lib/response';
import { isUuid } from '../../../lib/validation';

export const GET: APIRoute = async ({ params, request }) => {
  const cors = corsHeaders(request);
  const { id } = params;

  if (!id || !isUuid(id)) {
    return jsonError('Missing or invalid puzzle id', 400, 'INVALID_INPUT', cors);
  }

  if (!supabaseAdmin) {
    return jsonError('Database not configured', 503, 'DB_UNAVAILABLE', cors);
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('puzzles')
    .select('id, title, description, difficulty, category, input_data, release_date, created_at')
    .eq('id', id)
    .lte('release_date', today)
    .single();

  if (error || !data) {
    return jsonError('Puzzle not found or not yet released', 404, 'NOT_FOUND', cors);
  }

  // ── Server-side timing: create a puzzle session if API key provided ──────
  const apiKey = request.headers.get('x-api-key');
  let sessionId: string | null = null;

  if (apiKey && isUuid(apiKey)) {
    // Validate api key exists — uses supabaseAdmin (anon role has api_key revoked)
    const agent = await getAgentByKey(apiKey);

    if (agent) {
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
    'Cache-Control': 'public, max-age=3600',
  });
};
