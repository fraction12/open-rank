-- Human challenge depth upgrades:
-- 1) Structured solve notes + rubric scores
-- 2) Per-session challenge variants
-- 3) Human leaderboard tie-break uses rubric score after solve score/time

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS fix_plan text,
  ADD COLUMN IF NOT EXISTS verification_steps text,
  ADD COLUMN IF NOT EXISTS confidence_level integer,
  ADD COLUMN IF NOT EXISTS hints_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS rubric_attempt_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rubric_process_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rubric_verification_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rubric_total_score integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'submissions_confidence_level_check'
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_confidence_level_check
      CHECK (confidence_level IS NULL OR (confidence_level >= 1 AND confidence_level <= 5));
  END IF;
END $$;

ALTER TABLE puzzle_sessions
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS variant_title text;

DROP FUNCTION IF EXISTS leaderboard_humans_by_puzzle(uuid, int);
CREATE FUNCTION leaderboard_humans_by_puzzle(p_puzzle_id uuid, p_limit int DEFAULT 100)
RETURNS TABLE (
  rank bigint,
  github_login text,
  ai_tool text,
  score integer,
  rubric_total_score integer,
  time_ms integer,
  attempt_number integer,
  submitted_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH best AS (
    SELECT DISTINCT ON (s.user_id)
      s.user_id,
      u.github_login,
      s.ai_tool,
      s.score,
      s.rubric_total_score,
      s.time_ms,
      s.attempt_number,
      s.submitted_at
    FROM submissions s
    JOIN users u ON u.id = s.user_id
    WHERE s.puzzle_id = p_puzzle_id
      AND s.correct = true
      AND s.is_human = true
    ORDER BY s.user_id, s.score DESC, s.rubric_total_score DESC, s.time_ms ASC NULLS LAST, s.submitted_at DESC
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC, rubric_total_score DESC, time_ms ASC NULLS LAST) AS rank,
    github_login, ai_tool, score, rubric_total_score, time_ms, attempt_number, submitted_at
  FROM best
  ORDER BY score DESC, rubric_total_score DESC, time_ms ASC NULLS LAST
  LIMIT p_limit;
$$;
