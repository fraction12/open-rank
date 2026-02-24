import type { APIRoute } from 'astro';
import { supabaseAdmin, getCurrentUser } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { json, jsonError } from '../../../lib/response';
import { log } from '../../../lib/logger';
import { verifyCsrfHeader } from '../../../lib/csrf';
import { isUuid } from '../../../lib/validation';
import { selectChallengeVariant } from '../../../lib/challenge-variants';

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
 * Returns: { session_id, variant }
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
  let existingSession: { id: string; variant_id?: string | null; variant_title?: string | null } | null = null;
  {
    const { data, error } = await supabaseAdmin
      .from('puzzle_sessions')
      .select('id, variant_id, variant_title')
      .eq('puzzle_id', puzzle_id)
      .eq('user_id', currentUser.id)
      .eq('used', false)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      existingSession = data;
    } else {
      // Backward compatibility: migration may not be applied yet.
      const fallback = await supabaseAdmin
        .from('puzzle_sessions')
        .select('id')
        .eq('puzzle_id', puzzle_id)
        .eq('user_id', currentUser.id)
        .eq('used', false)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingSession = fallback.data ? { id: fallback.data.id } : null;
    }
  }

  if (existingSession) {
    const variant = selectChallengeVariant(`${puzzle_id}:${currentUser.id}:${existingSession.id}`);
    return json({
      session_id: existingSession.id,
      variant: {
        id: existingSession.variant_id ?? variant.id,
        title: existingSession.variant_title ?? variant.title,
        brief: variant.brief,
        success_criteria: variant.successCriteria,
        hint_track: variant.hintTrack,
      },
    }, 200, cors);
  }

  const variant = selectChallengeVariant(`${puzzle_id}:${currentUser.id}:${Date.now()}`);

  // ── Create new session (via supabaseAdmin — RLS locked) ───────────────────
  let newSession: { id: string; variant_id?: string | null; variant_title?: string | null } | null = null;
  let insertErr: { message?: string } | null = null;
  {
    const insertWithVariant = await supabaseAdmin
      .from('puzzle_sessions')
      .insert({
        puzzle_id,
        user_id: currentUser.id,
        started_at: new Date().toISOString(),
        used: false,
        variant_id: variant.id,
        variant_title: variant.title,
      })
      .select('id, variant_id, variant_title')
      .single();

    if (!insertWithVariant.error && insertWithVariant.data) {
      newSession = insertWithVariant.data;
    } else {
      const fallbackInsert = await supabaseAdmin
        .from('puzzle_sessions')
        .insert({
          puzzle_id,
          user_id: currentUser.id,
          started_at: new Date().toISOString(),
          used: false,
        })
        .select('id')
        .single();
      if (!fallbackInsert.error && fallbackInsert.data) {
        newSession = { id: fallbackInsert.data.id };
      } else {
        insertErr = { message: fallbackInsert.error?.message || insertWithVariant.error?.message };
      }
    }
  }

  if (insertErr || !newSession) {
    log('error', 'Failed to create puzzle session', { message: insertErr?.message });
    return jsonError('Failed to create challenge session', 500, 'INSERT_FAILED', cors);
  }

  return json({
    session_id: newSession.id,
    variant: {
      id: newSession.variant_id ?? variant.id,
      title: newSession.variant_title ?? variant.title,
      brief: variant.brief,
      success_criteria: variant.successCriteria,
      hint_track: variant.hintTrack,
    },
  }, 201, cors);
};
