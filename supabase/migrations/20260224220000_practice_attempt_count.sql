-- Add practice attempt counter to puzzles
ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS practice_attempt_count int NOT NULL DEFAULT 0;

-- Backfill from existing practice submissions
UPDATE puzzles p
SET practice_attempt_count = (
  SELECT COUNT(*) FROM submissions s
  WHERE s.puzzle_id = p.id AND s.is_practice = true
);

-- Delete existing practice submission rows
DELETE FROM submissions WHERE is_practice = true;
