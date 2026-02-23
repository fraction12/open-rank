import type { APIRoute } from 'astro';
import { supabaseAdmin, getCurrentUser } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json, jsonError } from '../../../lib/response';
import { log } from '../../../lib/logger';
import { verifyCsrfHeader } from '../../../lib/csrf';
import { isUuid } from '../../../lib/validation';

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
  if (!verifyCsrfHeader(request, cookies)) {
    return jsonError('Invalid CSRF token', 403, 'CSRF_INVALID', cors);
  }

  // ── Auth: require GitHub session ─────────────────────────
  // getCurrentUser uses the cookie-based SSR client — keep as-is
  const currentUser = await getCurrentUser(cookies);
  if (!currentUser) {
    return jsonError('Authentication required. Sign in with GitHub.', 401, 'UNAUTHORIZED', cors);
  }

  // ── Parse body ────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400, 'INVALID_JSON', cors);
  }

  const { puzzle_id } = body as { puzzle_id?: string };
  if (!puzzle_id || !isUuid(puzzle_id)) {
    return jsonError('puzzle_id must be a valid UUID', 400, 'INVALID_INPUT', cors);
  }

  // ── Guard: supabaseAdmin required for puzzle_sessions (RLS locked) ────────
  if (!supabaseAdmin) return jsonError('Database not configured', 503, 'DB_UNAVAILABLE', cors);

  // ── Verify puzzle exists and is released ──────────────────
  // Use supabaseAdmin — anon SELECT on puzzles is revoked (H2/H5 fix)
  const today = new Date().toISOString().split('T')[0];
  const { data: puzzle, error: puzzleErr } = await supabaseAdmin
    .from('puzzles')
    .select('id, release_date')
    .eq('id', puzzle_id)
    .lte('release_date', today)
    .single();

  if (puzzleErr || !puzzle) {
    return jsonError('Puzzle not found or not yet released', 404, 'NOT_FOUND', cors);
  }

  // ── Check for existing unused session (via supabaseAdmin — RLS locked) ────
  // Prevents farming: if a session exists for this user+puzzle, reuse it
  const { data: existingSession } = await supabaseAdmin
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

  // ── Create new session (via supabaseAdmin — RLS locked) ───────────────────
  const { data: newSession, error: insertErr } = await supabaseAdmin
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
    log('error', 'Failed to create puzzle session', { message: insertErr?.message });
    return jsonError('Failed to create challenge session', 500, 'INSERT_FAILED', cors);
  }

  return json({ session_id: newSession.id }, 201, cors);
};
