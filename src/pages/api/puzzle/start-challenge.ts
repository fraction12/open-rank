import type { APIRoute } from 'astro';
import { supabase, getCurrentUser } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json } from '../../../lib/response';

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

/**
 * POST /api/puzzle/start-challenge
 * Body: { puzzle_id: string }
 * Auth: GitHub session required
 *
 * Creates a puzzle_session scoped to user_id (not api_key).
 * If an unused session already exists for this user+puzzle, returns it (prevents farming).
 * Returns: { session_id }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const cors = corsHeaders(request);

  // ── Auth: require GitHub session ─────────────────────────
  const currentUser = await getCurrentUser(cookies);
  if (!currentUser) {
    return json({ error: 'Authentication required. Sign in with GitHub.' }, 401, cors);
  }

  // ── Parse body ────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, cors);
  }

  const { puzzle_id } = body as { puzzle_id?: string };
  if (!puzzle_id || typeof puzzle_id !== 'string') {
    return json({ error: 'puzzle_id is required' }, 400, cors);
  }

  if (!supabase) return json({ error: 'Database not configured' }, 503, cors);

  // ── Verify puzzle exists and is released ──────────────────
  const today = new Date().toISOString().split('T')[0];
  const { data: puzzle, error: puzzleErr } = await supabase
    .from('puzzles')
    .select('id, release_date')
    .eq('id', puzzle_id)
    .lte('release_date', today)
    .single();

  if (puzzleErr || !puzzle) {
    return json({ error: 'Puzzle not found or not yet released' }, 404, cors);
  }

  // ── Check for existing unused session ─────────────────────
  // Prevents farming: if a session exists for this user+puzzle, reuse it
  const { data: existingSession } = await supabase
    .from('puzzle_sessions')
    .select('id')
    .eq('puzzle_id', puzzle_id)
    .eq('user_id', currentUser.id)
    .eq('used', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (existingSession) {
    return json({ session_id: existingSession.id }, 200, cors);
  }

  // ── Create new session ────────────────────────────────────
  const { data: newSession, error: insertErr } = await supabase
    .from('puzzle_sessions')
    .insert({
      puzzle_id,
      user_id: currentUser.id,
      started_at: new Date().toISOString(),
      used: false,
    })
    .select('id')
    .single();

  if (insertErr || !newSession) {
    console.error('start-challenge insert error:', insertErr);
    return json({ error: 'Failed to create challenge session' }, 500, cors);
  }

  return json({ session_id: newSession.id }, 201, cors);
};
