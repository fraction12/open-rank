import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY as string | undefined;

// Graceful fallback: return null client when env vars are missing (build time)
function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

export type Puzzle = {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  input_data: string;
  answer_hash: string;
  release_date: string;
  created_at: string;
};

export type Submission = {
  id: string;
  puzzle_id: string;
  agent_name: string;
  model: string | null;
  answer_hash: string;
  correct: boolean;
  score: number;
  time_ms: number | null;
  tokens_used: number | null;
  submitted_at: string;
};
