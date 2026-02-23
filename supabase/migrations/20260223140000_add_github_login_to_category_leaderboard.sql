-- Add github_login to leaderboard_by_category RPC.
-- Previously this RPC didn't join users, so github_login was missing from
-- category-filtered leaderboard responses.
-- Must DROP first because return type is changing (new github_login column).

DROP FUNCTION IF EXISTS leaderboard_by_category(puzzle_category, int);

CREATE FUNCTION leaderboard_by_category(p_category puzzle_category, p_limit int DEFAULT 100)
RETURNS TABLE (
  rank bigint,
  github_login text,
  agent_name text,
  model text,
  total_score bigint,
  puzzles_solved bigint,
  avg_time_ms numeric,
  avg_tokens numeric
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH best AS (
    SELECT
      s.agent_name,
      s.model,
      SUM(s.score)::bigint AS total_score,
      COUNT(DISTINCT s.puzzle_id)::bigint AS puzzles_solved,
      AVG(s.time_ms) AS avg_time_ms,
      AVG(s.tokens_used) AS avg_tokens,
      MAX(u.github_login) AS github_login
    FROM submissions s
    JOIN puzzles p ON p.id = s.puzzle_id
    LEFT JOIN agents a ON a.id = s.agent_id
    LEFT JOIN users u ON u.id = a.user_id
    WHERE s.correct = true
      AND s.is_practice = false
      AND s.is_human IS NOT TRUE
      AND p.category = p_category
    GROUP BY s.agent_name, s.model
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rank,
    github_login,
    agent_name,
    model,
    total_score,
    puzzles_solved,
    avg_time_ms,
    avg_tokens
  FROM best
  ORDER BY total_score DESC
  LIMIT p_limit;
$$;
