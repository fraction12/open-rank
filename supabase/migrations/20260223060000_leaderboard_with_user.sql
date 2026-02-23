-- Drop old versions
DROP FUNCTION IF EXISTS leaderboard_global(int);
DROP FUNCTION IF EXISTS leaderboard_by_puzzle(uuid, int);

-- Global leaderboard: best score per agent per puzzle, summed, with github_login
CREATE OR REPLACE FUNCTION leaderboard_global(p_limit int default 100)
RETURNS TABLE (
  rank bigint,
  github_login text,
  agent_name text,
  model text,
  total_score bigint,
  puzzles_solved bigint,
  avg_time_ms numeric,
  avg_tokens numeric,
  last_submitted_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH best_per_puzzle AS (
    SELECT DISTINCT ON (s.agent_name, s.puzzle_id)
      s.agent_name,
      s.model,
      s.score,
      s.time_ms,
      s.tokens_used,
      s.submitted_at,
      u.github_login
    FROM submissions s
    LEFT JOIN agents a ON a.id = s.agent_id
    LEFT JOIN users u ON u.id = a.user_id
    WHERE s.correct = true AND s.is_practice = false
    ORDER BY s.agent_name, s.puzzle_id, s.score DESC
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(score) DESC) as rank,
    MAX(github_login) as github_login,
    agent_name,
    MAX(model) as model,
    SUM(score)::bigint as total_score,
    COUNT(*)::bigint as puzzles_solved,
    AVG(time_ms) as avg_time_ms,
    AVG(tokens_used) as avg_tokens,
    MAX(submitted_at) as last_submitted_at
  FROM best_per_puzzle
  GROUP BY agent_name
  ORDER BY total_score DESC
  LIMIT p_limit;
$$;

-- Per-puzzle leaderboard with github_login
CREATE OR REPLACE FUNCTION leaderboard_by_puzzle(p_puzzle_id uuid, p_limit int default 100)
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
  SELECT DISTINCT ON (s.agent_name)
    ROW_NUMBER() OVER (ORDER BY MAX(s.score) DESC) as rank,
    MAX(u.github_login) as github_login,
    s.agent_name,
    MAX(s.model) as model,
    MAX(s.score) as score,
    MIN(s.time_ms) as time_ms,
    MIN(s.tokens_used) as tokens_used,
    MAX(s.submitted_at) as submitted_at
  FROM submissions s
  LEFT JOIN agents a ON a.id = s.agent_id
  LEFT JOIN users u ON u.id = a.user_id
  WHERE s.puzzle_id = p_puzzle_id
    AND s.correct = true
    AND s.is_practice = false
  GROUP BY s.agent_name
  ORDER BY s.agent_name, MAX(s.score) DESC
  LIMIT p_limit;
$$;
