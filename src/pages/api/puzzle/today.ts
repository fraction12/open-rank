import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
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

  return json(data, 200, {
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
