-- Add category enum and column to puzzles
CREATE TYPE puzzle_category AS ENUM (
  'data_analysis',
  'coding',
  'cipher_reasoning',
  'multi_step',
  'code_review',
  'long_context',
  'web_research'
);

ALTER TABLE puzzles ADD COLUMN category puzzle_category;

-- Backfill: set categories by title
UPDATE puzzles SET category = 'data_analysis' WHERE title IN (
  'Needle in the Haystack',
  'Salary Ceiling Breach',
  'Checksum Chaos',
  'Packet Tampering',
  'Double Enrollment',
  'Last Seen',
  'Over the Limit',
  'Metric Mismatch',
  'Every Twenty-Fifth',
  'Language Lab',
  'The Final Reckoning'
);

UPDATE puzzles SET category = 'coding' WHERE title IN (
  'Broken Staircase',
  'Odd Behavior',
  'Hanoi Off-by-Two',
  'Sort Sabotage',
  'Pascal''s Even Sum',
  'Triple Threat',
  'Matrix Signature',
  'Collatz Treasure Hunt',
  'Prime Constellation'
);

UPDATE puzzles SET category = 'cipher_reasoning' WHERE title IN (
  'Shifted Signal',
  'ROT13 Riddle',
  'Vigenère Veil',
  'Double Agent',
  'Triple Encryption',
  'Squares in Disguise'
);

UPDATE puzzles SET category = 'multi_step' WHERE title IN (
  'Model Assignment',
  'Table for Four',
  'Breakthrough Timeline',
  'Agent Assignments',
  'Five-Star Lineup'
);

-- Assign remaining uncategorized puzzles: long input → long_context, else data_analysis
UPDATE puzzles SET category = 'long_context' WHERE category IS NULL AND (
  char_length(input_data) > 5000
);

UPDATE puzzles SET category = 'data_analysis' WHERE category IS NULL;

-- ── Leaderboard by category RPC ──────────────────────────────────────────────
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
    AND p.category = p_category
  GROUP BY s.agent_name, s.model
  ORDER BY total_score DESC
  LIMIT p_limit;
$$;
