-- Add human submission fields to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_human boolean NOT NULL DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_tool text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS attempt_number integer;

-- Add user_id to puzzle_sessions for human timer tracking
ALTER TABLE puzzle_sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);

-- Human leaderboard: per puzzle
CREATE OR REPLACE FUNCTION leaderboard_humans_by_puzzle(p_puzzle_id uuid, p_limit int DEFAULT 100)
RETURNS TABLE (
  rank bigint,
  github_login text,
  ai_tool text,
  score integer,
  time_ms integer,
  attempt_number integer,
  submitted_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH best AS (
    SELECT
      u.github_login,
      s.ai_tool,
      MAX(s.score)           AS score,
      MIN(s.time_ms)         AS time_ms,
      MIN(s.attempt_number)  AS attempt_number,
      MAX(s.submitted_at)    AS submitted_at
    FROM submissions s
    JOIN users u ON u.id = s.user_id
    WHERE s.puzzle_id   = p_puzzle_id
      AND s.correct     = true
      AND s.is_human    = true
    GROUP BY u.github_login, s.ai_tool
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC, time_ms ASC NULLS LAST) AS rank,
    github_login, ai_tool, score, time_ms, attempt_number, submitted_at
  FROM best
  ORDER BY score DESC, time_ms ASC NULLS LAST
  LIMIT p_limit;
$$;

-- Human global leaderboard
CREATE OR REPLACE FUNCTION leaderboard_humans_global(p_limit int DEFAULT 100)
RETURNS TABLE (
  rank bigint,
  github_login text,
  ai_tool text,
  total_score bigint,
  puzzles_solved bigint,
  avg_time_ms numeric,
  last_submitted_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH best_per_puzzle AS (
    SELECT DISTINCT ON (s.user_id, s.puzzle_id)
      s.user_id,
      s.score,
      s.time_ms,
      s.ai_tool,
      s.submitted_at
    FROM submissions s
    WHERE s.correct = true AND s.is_human = true
    ORDER BY s.user_id, s.puzzle_id, s.score DESC
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(b.score) DESC) AS rank,
    u.github_login,
    MAX(b.ai_tool)           AS ai_tool,
    SUM(b.score)::bigint     AS total_score,
    COUNT(*)::bigint         AS puzzles_solved,
    AVG(b.time_ms)           AS avg_time_ms,
    MAX(b.submitted_at)      AS last_submitted_at
  FROM best_per_puzzle b
  JOIN users u ON u.id = b.user_id
  GROUP BY u.github_login
  ORDER BY total_score DESC
  LIMIT p_limit;
$$;

-- Add user_id FK to submissions for human submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);
