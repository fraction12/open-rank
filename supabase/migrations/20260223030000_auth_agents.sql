-- Users (created on first GitHub OAuth login)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id bigint UNIQUE NOT NULL,
  github_login text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Agents (belong to users, each has a unique API key)
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  api_key uuid UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT agent_name_length CHECK (char_length(name) <= 50)
);

-- Puzzle sessions (for server-side timing)
CREATE TABLE puzzle_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id uuid REFERENCES puzzles(id) ON DELETE CASCADE NOT NULL,
  api_key uuid, -- null = practice/anonymous
  started_at timestamptz DEFAULT now(),
  used boolean DEFAULT false -- prevent session reuse
);

-- Add columns to submissions
ALTER TABLE submissions ADD COLUMN user_id uuid REFERENCES users(id);
ALTER TABLE submissions ADD COLUMN agent_id uuid REFERENCES agents(id);
ALTER TABLE submissions ADD COLUMN is_practice boolean DEFAULT false;
ALTER TABLE submissions ADD COLUMN session_id uuid REFERENCES puzzle_sessions(id);
ALTER TABLE submissions ADD COLUMN skill_used text; -- self-reported skill name

-- RLS for new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzle_sessions ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read public profiles, only own row for private data
CREATE POLICY "Users are publicly readable" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Agents: anyone can read, only owner can insert/update/delete
CREATE POLICY "Agents are publicly readable" ON agents FOR SELECT USING (true);
CREATE POLICY "Users manage own agents" ON agents FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE github_id = (auth.jwt() ->> 'sub')::bigint)
);

-- Puzzle sessions: server creates them (service role), agents can read own
CREATE POLICY "Anyone can create puzzle session" ON puzzle_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read puzzle sessions" ON puzzle_sessions FOR SELECT USING (true);
CREATE POLICY "Server can update sessions" ON puzzle_sessions FOR UPDATE USING (true);

-- Drop existing functions so we can change their return types
DROP FUNCTION IF EXISTS leaderboard_by_puzzle(uuid, int);
DROP FUNCTION IF EXISTS leaderboard_global(int);

-- Updated leaderboard_by_puzzle to exclude practice
CREATE OR REPLACE FUNCTION leaderboard_by_puzzle(p_puzzle_id uuid, p_limit int default 100)
RETURNS TABLE(agent_name text, model text, score numeric, time_ms int, tokens_used int, submitted_at timestamptz) AS $$
  SELECT s.agent_name, s.model, MAX(s.score) as score, MIN(s.time_ms) as time_ms, MIN(s.tokens_used) as tokens_used, MAX(s.submitted_at) as submitted_at
  FROM submissions s
  WHERE s.puzzle_id = p_puzzle_id AND s.correct = true AND (s.is_practice = false OR s.is_practice IS NULL)
  GROUP BY s.agent_name, s.model
  ORDER BY score DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- Updated global leaderboard to exclude practice + include avg time/tokens
CREATE OR REPLACE FUNCTION leaderboard_global(p_limit int default 100)
RETURNS TABLE(agent_name text, total_score numeric, puzzles_solved bigint, best_model text, avg_time_ms numeric, avg_tokens numeric) AS $$
  SELECT
    s.agent_name,
    SUM(best.score) as total_score,
    COUNT(DISTINCT best.puzzle_id) as puzzles_solved,
    MODE() WITHIN GROUP (ORDER BY s.model) as best_model,
    AVG(best.time_ms) as avg_time_ms,
    AVG(best.tokens_used) as avg_tokens
  FROM (
    SELECT DISTINCT ON (puzzle_id, agent_name) puzzle_id, agent_name, score, time_ms, tokens_used
    FROM submissions
    WHERE correct = true AND (is_practice = false OR is_practice IS NULL)
    ORDER BY puzzle_id, agent_name, score DESC
  ) best
  JOIN submissions s ON s.puzzle_id = best.puzzle_id AND s.agent_name = best.agent_name
  GROUP BY s.agent_name
  ORDER BY total_score DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
