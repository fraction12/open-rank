import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// Use dynamic key access to prevent Vite/build tools from statically inlining env vars.
// process.env is runtime-safe in Vercel serverless; import.meta.env is build-time fallback.
const urlKey = 'SUPABASE_URL';
const keyKey = 'SUPABASE_ANON_KEY';
const supabaseUrl = (typeof process !== 'undefined' ? process.env[urlKey] : undefined) || import.meta.env.SUPABASE_URL as string | undefined;
const supabaseAnonKey = (typeof process !== 'undefined' ? process.env[keyKey] : undefined) || import.meta.env.SUPABASE_ANON_KEY as string | undefined;

// Graceful fallback: return null client when env vars are missing (build time)
function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

// ── Service role client (bypasses RLS — use only in server-side routes with prior auth checks) ──
const serviceRoleKey = (typeof process !== 'undefined' ? process.env['SUPABASE_SERVICE_ROLE_KEY'] : undefined) || import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const supabaseAdmin = createAdminClient();

// ── Server client with cookie support (for auth) ────────────────────────────
export function createSupabaseServerClient(cookies: any) {
  const url = (typeof process !== 'undefined' ? process.env[urlKey] : undefined) || import.meta.env.SUPABASE_URL as string;
  const key = (typeof process !== 'undefined' ? process.env[keyKey] : undefined) || import.meta.env.SUPABASE_ANON_KEY as string;

  return createServerClient(url, key, {
    cookies: {
      getAll: () => {
        // cookies is an Astro AstroCookies object
        // We need to return all cookies as { name, value }[]
        // But Astro's cookies object doesn't expose getAll easily,
        // so we use the get method per name via a Proxy approach.
        // For our auth use case, we just need to support get(name) via getAll.
        return [];
      },
      setAll: () => {},
    },
    cookieOptions: {
      sameSite: 'lax',
      secure: true,
    },
  });
}

// ── Helper: get current user from request cookies ───────────────────────────
export async function getCurrentUser(cookies: any) {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  // Build a server client using the @supabase/ssr approach
  // We pass cookies via the get method
  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => {
        // Return all cookies as array of { name, value }
        // Astro cookies doesn't expose getAll, so we use a known list of Supabase cookie names
        // The main one is sb-<project>-auth-token
        const cookieNames = [
          'sb-tpzuvnopnagnbzebfwab-auth-token',
          'sb-tpzuvnopnagnbzebfwab-auth-token.0',
          'sb-tpzuvnopnagnbzebfwab-auth-token.1',
          'sb-tpzuvnopnagnbzebfwab-auth-token-code-verifier',
        ];
        return cookieNames
          .map(name => ({ name, value: cookies.get(name)?.value ?? '' }))
          .filter(c => c.value !== '');
      },
      setAll: () => {},
    },
  });

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  // Get our users table row
  const providerId = user.user_metadata?.provider_id ?? user.user_metadata?.sub;
  if (!providerId) return null;
  const githubId = parseInt(String(providerId));
  if (isNaN(githubId)) return null;

  if (!supabase) return null;
  const { data } = await supabase.from('users').select('*').eq('github_id', githubId).single();
  return data ?? null;
}

// ── Helper: get agent from API key ───────────────────────────────────────────
export async function getAgentByKey(apiKey: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('agents')
    .select('id, name, user_id, users(github_login)')
    .eq('api_key', apiKey)
    .single();
  return data ?? null;
}

// ── Types ────────────────────────────────────────────────────────────────────
export type Puzzle = {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  category: 'data_analysis' | 'coding' | 'cipher_reasoning' | 'multi_step' | 'code_review' | 'long_context' | 'web_research' | null;
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

export type User = {
  id: string;
  github_id: number;
  github_login: string;
  avatar_url: string | null;
  created_at: string;
};

export type Agent = {
  id: string;
  user_id: string;
  name: string;
  api_key: string;
  created_at: string;
};
