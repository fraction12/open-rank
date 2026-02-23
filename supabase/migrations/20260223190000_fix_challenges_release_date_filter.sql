-- Fix: challenges_with_stats RPC was returning future challenges (no release_date filter).
-- The detail page correctly blocked them (redirect), but the list showed them as clickable.
-- Now only return challenges with release_date <= CURRENT_DATE.

CREATE OR REPLACE FUNCTION challenges_with_stats(p_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  difficulty text,
  category puzzle_category,
  release_date date,
  total_attempts bigint,
  unique_solvers bigint,
  best_time_ms integer
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.title,
    p.description,
    p.difficulty,
    p.category,
    p.release_date,
    COUNT(s.id)::bigint AS total_attempts,
    COUNT(DISTINCT s.user_id) FILTER (WHERE s.correct = true)::bigint AS unique_solvers,
    MIN(s.time_ms) FILTER (WHERE s.correct = true) AS best_time_ms
  FROM puzzles p
  LEFT JOIN submissions s ON s.puzzle_id = p.id AND s.is_human = true
  WHERE p.category = 'agentic_engineering'
    AND p.release_date <= CURRENT_DATE
  GROUP BY p.id, p.title, p.description, p.difficulty, p.category, p.release_date
  ORDER BY p.release_date DESC
  LIMIT p_limit;
$$;
