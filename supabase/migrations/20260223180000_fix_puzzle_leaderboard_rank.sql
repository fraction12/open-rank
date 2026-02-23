-- M3: Fix leaderboard_by_puzzle rank ordering bug
-- Remove DISTINCT ON, use GROUP BY consistently, fix ROW_NUMBER ordering

DROP FUNCTION IF EXISTS leaderboard_by_puzzle(uuid, int);

CREATE FUNCTION leaderboard_by_puzzle(p_puzzle_id uuid, p_limit int default 100)
RETURNS TABLE (
  rank bigint,
  github_login text,
  agent_name text,
  model text,
  score integer,
  time_ms integer,
  tokens_used integer,
  submitted_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH best AS (
    SELECT
      s.agent_name,
      MAX(s.model) AS model,
      MAX(s.score) AS score,
      MIN(s.time_ms) AS time_ms,
      MIN(s.tokens_used) AS tokens_used,
      MAX(s.submitted_at) AS submitted_at,
      MAX(u.github_login) AS github_login
    FROM submissions s
    LEFT JOIN agents a ON a.id = s.agent_id
    LEFT JOIN users u ON u.id = a.user_id
    WHERE s.puzzle_id = p_puzzle_id
      AND s.correct = true
      AND s.is_practice = false
      AND s.is_human IS NOT TRUE
    GROUP BY s.agent_name
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC, time_ms ASC NULLS LAST) AS rank,
    github_login,
    agent_name,
    model,
    score,
    time_ms,
    tokens_used,
    submitted_at
  FROM best
  ORDER BY score DESC, time_ms ASC NULLS LAST
  LIMIT p_limit;
$$;
