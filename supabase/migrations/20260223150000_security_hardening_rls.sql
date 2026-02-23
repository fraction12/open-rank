-- ═══════════════════════════════════════════════════════════════
-- Security hardening: C1 + C2 + C5 + H1
-- All DB writes in API routes now use supabaseAdmin (service role).
-- Service role bypasses RLS, so setting USING (false) blocks anon
-- while keeping server-side operations intact.
-- ═══════════════════════════════════════════════════════════════

-- ── C1: Prevent duplicate correct human submissions (score farming) ───────
CREATE UNIQUE INDEX IF NOT EXISTS submissions_human_unique
  ON submissions (user_id, puzzle_id)
  WHERE is_human = true AND correct = true;

-- ── H1: Lock down submissions table — anon has no direct access ──────────
-- All inserts/reads now go through supabaseAdmin (service role) in submit.ts.
-- Leaderboard reads go through SECURITY DEFINER RPCs, so no direct SELECT needed.
DROP POLICY IF EXISTS "Anyone can submit" ON submissions;
DROP POLICY IF EXISTS "Anyone can read submissions" ON submissions;
-- Drop any other permissive policies that might exist
DROP POLICY IF EXISTS "Allow read for non-practice" ON submissions;

CREATE POLICY "Service role only"
  ON submissions FOR ALL
  USING (false)
  WITH CHECK (false);

-- ── C2: Lock down puzzle_sessions — only service role can manage ──────────
DROP POLICY IF EXISTS "Anyone can create puzzle session" ON puzzle_sessions;
DROP POLICY IF EXISTS "Server can update sessions" ON puzzle_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON puzzle_sessions;

CREATE POLICY "Service role can manage sessions"
  ON puzzle_sessions FOR ALL
  USING (false)
  WITH CHECK (false);

-- ── C5: Lock down rate_limits — only service role can access ─────────────
DROP POLICY IF EXISTS "Service can manage rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;

CREATE POLICY "Block anon access"
  ON rate_limits FOR ALL
  USING (false)
  WITH CHECK (false);
