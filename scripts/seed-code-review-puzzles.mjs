#!/usr/bin/env node
/**
 * Seed the 5 Code Review puzzles — each based on a real bug from building OpenRank.
 * Run from project root: node scripts/seed-code-review-puzzles.mjs
 */
import { createHash, randomUUID } from 'crypto';
import { readFileSync } from 'fs';

function loadEnv() {
  const raw = readFileSync('.env.local', 'utf8');
  return Object.fromEntries(
    raw.split('\n')
      .filter(l => l.includes('='))
      .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
  );
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL;
const ANSWER_SALT = env.ANSWER_SALT;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

function saltedHash(answer, puzzleId) {
  return createHash('sha256').update(`${answer}:${puzzleId}:${ANSWER_SALT}`).digest('hex');
}

async function supaFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUZZLE 1: The Trailing Secret
// Bug: echo adds \n to piped secrets. ANSWER_SALT becomes 65 chars, all hashes fail.
// Answer: line 13
// ─────────────────────────────────────────────────────────────────────────────
const p1 = {
  id: randomUUID(),
  title: 'The Trailing Secret',
  difficulty: 'medium',
  category: 'code_review',
  release_date: '2026-03-28',
  description: `A developer ran this script to deploy secrets to a Vercel production project. After deploying, every answer hash comparison returned \`false\` — even for verified correct answers. The ANSWER_SALT in production was **65 characters** long instead of the expected 64. The source value on line 9 is correct: exactly 64 hex characters.

On which **line number** is the bug that adds the extra character?`,
  input_data: `1  #!/bin/bash
2  # seed-production.sh
3  # Deploys secrets to Vercel production environment.
4  
5  set -euo pipefail
6  
7  SUPABASE_URL="https://tpzuvnopnagnbzebfwab.supabase.co"
8  SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.example"
9  ANSWER_SALT="2892972be3d5a3c4fdfd946ce94956e056948a10e03823bef4fd909cbec963ac"
10 
11 echo "$SUPABASE_URL" | vercel env add SUPABASE_URL production
12 echo "$SUPABASE_ANON_KEY" | vercel env add SUPABASE_ANON_KEY production
13 echo "$ANSWER_SALT" | vercel env add ANSWER_SALT production
14 
15 echo "✅ All secrets deployed to production"`,
  answer: '13',
};

// ─────────────────────────────────────────────────────────────────────────────
// PUZZLE 2: The Silent Rejection
// Bug: no INSERT policy on users table. Upsert silently fails with anon key.
// Answer: INSERT
// ─────────────────────────────────────────────────────────────────────────────
const p2 = {
  id: randomUUID(),
  title: 'The Silent Rejection',
  difficulty: 'hard',
  category: 'code_review',
  release_date: '2026-03-29',
  description: `After deploying this Supabase migration, GitHub OAuth login appears to succeed — the callback logs show no errors and the user is redirected to \`/dashboard\`. But the dashboard immediately bounces the user back to \`/api/auth/signin\`.

The OAuth callback runs this after a successful code exchange:
\`\`\`
supabase.from('users').upsert({ github_id, github_login, avatar_url }, { onConflict: 'github_id' })
\`\`\`

The upsert returns no error. The row is never saved. \`getCurrentUser\` finds nothing and returns \`null\`.

What SQL **operation type** is missing from the RLS policies on the \`users\` table? Answer with the single SQL keyword.`,
  input_data: `-- Migration: 20260220_users_rls.sql
-- Sets up the users table with Row Level Security

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id bigint UNIQUE NOT NULL,
  github_login text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users are publicly readable"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);`,
  answer: 'INSERT',
};

// ─────────────────────────────────────────────────────────────────────────────
// PUZZLE 3: The Build Ghost
// Bug: .vercel/output/ committed to git. Vercel serves pre-built artifacts.
// Answer: .vercel/output
// ─────────────────────────────────────────────────────────────────────────────
const p3 = {
  id: randomUUID(),
  title: 'The Build Ghost',
  difficulty: 'easy',
  category: 'code_review',
  release_date: '2026-03-30',
  description: `A developer fixed a bug in the scoring algorithm and pushed to production. Vercel showed a successful deployment. But the old scoring logic kept running — the fix had no effect. API responses were unchanged. Re-deploying multiple times made no difference.

Looking at this git commit, what **directory path** in the repository is causing Vercel to serve stale pre-built code instead of rebuilding from source? Answer with the exact path.`,
  input_data: `commit a4f2c9d1e8b3047f6a5c2d9e1f7b4c8a5d2e6f3
Author: Dushyant Garg <dushyantgarg3@gmail.com>
Date:   Sun Feb 23 02:14:33 2026 -0500

    fix: update submit endpoint scoring algorithm

diff --git a/.vercel/output/config.json b/.vercel/output/config.json
new file mode 100644
+++ b/.vercel/output/config.json
@@ -0,0 +1,5 @@
+{
+  "version": 3,
+  "routes": []
+}

diff --git a/.vercel/output/functions/api/submit.func/index.js b/.vercel/output/functions/api/submit.func/index.js
new file mode 100644
+++ b/.vercel/output/functions/api/submit.func/index.js
@@ -0,0 +1,847 @@
+// [pre-compiled Vercel serverless function — 847 lines omitted]

diff --git a/src/pages/api/submit.ts b/src/pages/api/submit.ts
index 3a2c1f9..7d4e8b2 100644
--- a/src/pages/api/submit.ts
+++ b/src/pages/api/submit.ts
@@ -142,7 +142,7 @@
-  const score = correctness + speedBonus;
+  const score = correctness + speedBonus + efficiencyBonus;`,
  answer: '.vercel/output',
};

// ─────────────────────────────────────────────────────────────────────────────
// PUZZLE 4: The Static Secret
// Bug: Vite statically replaces process.env.ANSWER_SALT at build time.
// Private env vars not exposed at build → inlined as undefined.
// Answer: 9
// ─────────────────────────────────────────────────────────────────────────────
const p4 = {
  id: randomUUID(),
  title: 'The Static Secret',
  difficulty: 'hard',
  category: 'code_review',
  release_date: '2026-03-31',
  description: `This TypeScript utility runs in a **Vite SSR environment** deployed on Vercel. In local development, \`saltedHash\` works correctly. In production, every hash comparison returns \`false\`.

Adding \`console.log(salt)\` in production prints \`undefined\`. The \`ANSWER_SALT\` environment variable is confirmed present in Vercel's dashboard and verified via CLI — it's definitely set. The variable is private (not prefixed with \`PUBLIC_\`).

On which **line number** is the bug?`,
  input_data: `1  // src/lib/hash.ts
2  import { createHash } from 'crypto';
3  
4  /**
5   * Compute a salted SHA-256 hash for answer verification.
6   * Used server-side in POST /api/submit to validate agent answers.
7   */
8  export async function saltedHash(answer: string, puzzleId: string): Promise<string> {
9    const salt = process.env.ANSWER_SALT;
10   return createHash('sha256')
11     .update(\`\${answer}:\${puzzleId}:\${salt}\`)
12     .digest('hex');
13 }`,
  answer: '9',
};

// ─────────────────────────────────────────────────────────────────────────────
// PUZZLE 5: The Redirect Loop
// Bug: anon supabase client used for upsert instead of authenticated client.
// RLS blocks INSERT, row never saved, getCurrentUser returns null, loop.
// Answer: 23
// ─────────────────────────────────────────────────────────────────────────────
const p5 = {
  id: randomUUID(),
  title: 'The Redirect Loop',
  difficulty: 'hard',
  category: 'code_review',
  release_date: '2026-04-01',
  description: `GitHub OAuth login appears to succeed — \`exchangeCodeForSession\` returns no error and \`data.user\` is populated. The callback redirects to \`/dashboard\`. But the dashboard always redirects back to \`/api/auth/signin\` because \`getCurrentUser\` returns \`null\`.

Vercel logs show the loop clearly:
\`\`\`
GET /api/auth/callback  → 302 /dashboard
GET /dashboard          → 302 /api/auth/signin
GET /api/auth/signin    → 302 github.com
(repeat)
\`\`\`

The \`users\` table has these RLS policies: \`SELECT USING (true)\` and \`UPDATE USING (auth.uid()::text = id::text)\`. There is no INSERT policy — but adding one alone won't fix it.

On which **line number** is the incorrect Supabase client used for the database write?`,
  input_data: `1  // src/pages/api/auth/callback.ts
2  import type { APIRoute } from 'astro';
3  import { createServerClient } from '@supabase/ssr';
4  import { supabase } from '../../../lib/supabase'; // anon key, no session context
5  
6  export const GET: APIRoute = async ({ url, cookies, redirect }) => {
7    const code = url.searchParams.get('code');
8    if (!code) return redirect('/');
9  
10   const client = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
11     cookies: {
12       getAll: () => getCookies(cookies),
13       setAll: (cs) => setCookies(cookies, cs),
14     },
15   });
16 
17   const { data, error } = await client.auth.exchangeCodeForSession(code);
18   if (error || !data.user) return redirect('/?auth=error');
19 
20   const githubId  = parseInt(data.user.user_metadata?.provider_id);
21   const githubLogin = data.user.user_metadata?.user_name;
22 
23   await supabase.from('users').upsert({
24     github_id: githubId,
25     github_login: githubLogin,
26   }, { onConflict: 'github_id' });
27 
28   return redirect('/dashboard');
29 };`,
  answer: '23',
};

// ─────────────────────────────────────────────────────────────────────────────
// Seed all 5
// ─────────────────────────────────────────────────────────────────────────────
const puzzles = [p1, p2, p3, p4, p5];

console.log('\n🧩 Seeding 5 Code Review puzzles...\n');

for (const puzzle of puzzles) {
  const { answer, ...puzzleData } = puzzle;
  const answerHash = saltedHash(answer.trim(), puzzle.id);

  const { ok, status, data } = await supaFetch('/puzzles', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...puzzleData, answer_hash: answerHash }),
  });

  if (ok) {
    console.log(`✅ [${puzzle.release_date}] ${puzzle.title} (answer: "${answer}", hash: ${answerHash.slice(0,8)}...)`);
  } else {
    console.error(`❌ [${puzzle.release_date}] ${puzzle.title} — HTTP ${status}:`, JSON.stringify(data));
  }
}

console.log('\n✨ Done.\n');
