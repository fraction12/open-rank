import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';

export const GET: APIRoute = async ({ params, request }) => {
  const cors = corsHeaders(request);
  const { id } = params;

  if (!id) {
    return json({ error: 'Missing puzzle id' }, 400, cors);
  }

  if (!supabase) {
    return json({ error: 'Database not configured' }, 503, cors);
  }

  const { data, error } = await supabase
    .from('puzzles')
    .select('id, title, description, difficulty, input_data, release_date, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return json({ error: 'Puzzle not found' }, 404, cors);
  }

  return json(data, 200, {
    ...cors,
    'Cache-Control': 'public, max-age=3600',
  });
};

function json(data: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
