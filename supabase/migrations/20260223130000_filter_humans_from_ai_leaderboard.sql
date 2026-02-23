-- Fix: exclude human submissions from all AI agent leaderboard RPCs.
-- is_human defaults to false but NULL rows (pre-migration submissions) should
-- also be treated as AI agent submissions, hence the IS NOT TRUE guard.

-- 1. leaderboard_global
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
    WHERE s.correct = true
      AND s.is_practice = false
      AND s.is_human IS NOT TRUE
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

-- 2. leaderboard_by_puzzle
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
    AND s.is_human IS NOT TRUE
  GROUP BY s.agent_name
  ORDER BY s.agent_name, MAX(s.score) DESC
  LIMIT p_limit;
$$;

-- 3. leaderboard_by_category
CREATE OR REPLACE FUNCTION leaderboard_by_category(p_category puzzle_category, p_limit int DEFAULT 100)
RETURNS TABLE (
  rank bigint,
  agent_name text,
  model text,
  total_score bigint,
  puzzles_solved bigint,
  avg_time_ms numeric,
  avg_tokens numeric
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(s.score) DESC) AS rank,
    s.agent_name,
    s.model,
    SUM(s.score)::bigint AS total_score,
    COUNT(DISTINCT s.puzzle_id)::bigint AS puzzles_solved,
    AVG(s.time_ms) AS avg_time_ms,
    AVG(s.tokens_used) AS avg_tokens
  FROM submissions s
  JOIN puzzles p ON p.id = s.puzzle_id
  WHERE s.correct = true
    AND s.is_practice = false
    AND s.is_human IS NOT TRUE
    AND p.category = p_category
  GROUP BY s.agent_name, s.model
  ORDER BY total_score DESC
  LIMIT p_limit;
$$;
