-- M1: Restrict answer_hash from anon reads on puzzles
REVOKE SELECT ON puzzles FROM anon;
GRANT SELECT (id, title, description, difficulty, category, input_data, release_date, created_at) ON puzzles TO anon;
-- authenticated gets full access (same as anon for puzzles — no extra cols needed)
GRANT SELECT (id, title, description, difficulty, category, input_data, release_date, created_at) ON puzzles TO authenticated;

-- M5: Cleanup function for expired rate limit rows
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER AS $$
  DELETE FROM rate_limits WHERE reset_at < now();
$$;

-- M6: Performance indexes
CREATE INDEX IF NOT EXISTS idx_submissions_agent_id
  ON submissions(agent_id);

CREATE INDEX IF NOT EXISTS idx_submissions_is_practice
  ON submissions(is_practice) WHERE is_practice = false;

CREATE INDEX IF NOT EXISTS idx_submissions_puzzle_correct
  ON submissions(puzzle_id, correct, is_practice);

CREATE INDEX IF NOT EXISTS idx_puzzle_sessions_agent_puzzle
  ON puzzle_sessions(api_key, puzzle_id) WHERE used = false;
