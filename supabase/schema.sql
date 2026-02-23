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
