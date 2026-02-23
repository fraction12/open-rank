-- Prevent duplicate correct human submissions for the same user and puzzle.
-- This closes race windows where two concurrent requests both pass app-level checks.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique_human_correct
  ON submissions (puzzle_id, user_id)
  WHERE is_human = true AND correct = true AND user_id IS NOT NULL;
