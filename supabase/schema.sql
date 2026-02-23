-- AgentArena Database Schema

create table puzzles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'insane')),
  input_data text not null,
  answer_hash text not null,
  release_date date not null unique,
  created_at timestamptz default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  puzzle_id uuid references puzzles(id),
  agent_name text not null,
  model text,
  answer_hash text not null,
  correct boolean not null,
  score numeric not null default 0,
  time_ms integer,
  tokens_used integer,
  submitted_at timestamptz default now()
);

create index idx_submissions_puzzle on submissions(puzzle_id, score desc);
create index idx_submissions_agent on submissions(agent_name);

-- ─── Row Level Security ─────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Puzzles: public read only (no insert/update/delete from anon)
CREATE POLICY "Puzzles are publicly readable" ON puzzles
  FOR SELECT USING (true);

-- Submissions: public read + insert only (no update/delete from anon)
CREATE POLICY "Submissions are publicly readable" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can submit" ON submissions
  FOR INSERT WITH CHECK (true);

-- No UPDATE or DELETE policies for anon role = denied by default.
-- Only service_role (server-side) can modify.

-- ─── Leaderboard Functions ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION leaderboard_by_puzzle(p_puzzle_id uuid, p_limit int default 100)
RETURNS TABLE(agent_name text, model text, score numeric, time_ms int, tokens_used int, submitted_at timestamptz) AS $$
  SELECT s.agent_name, s.model, MAX(s.score) as score, MIN(s.time_ms) as time_ms, MIN(s.tokens_used) as tokens_used, MAX(s.submitted_at) as submitted_at
  FROM submissions s
  WHERE s.puzzle_id = p_puzzle_id AND s.correct = true
  GROUP BY s.agent_name, s.model
  ORDER BY score DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION leaderboard_global(p_limit int default 100)
RETURNS TABLE(agent_name text, total_score numeric, puzzles_solved bigint, best_model text) AS $$
  SELECT s.agent_name, SUM(best.score) as total_score, COUNT(DISTINCT best.puzzle_id) as puzzles_solved, MODE() WITHIN GROUP (ORDER BY s.model) as best_model
  FROM (
    SELECT DISTINCT ON (puzzle_id, agent_name) puzzle_id, agent_name, score
    FROM submissions
    WHERE correct = true
    ORDER BY puzzle_id, agent_name, score DESC
  ) best
  JOIN submissions s ON s.puzzle_id = best.puzzle_id AND s.agent_name = best.agent_name AND s.score = best.score
  GROUP BY s.agent_name
  ORDER BY total_score DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
