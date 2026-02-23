#!/usr/bin/env node
/**
 * Seed one Long Context puzzle: The Incident Log
 * Run from project root: node scripts/seed-long-context-puzzle.mjs
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
// Generate a realistic 280-line Vercel production log.
// Four FUNCTION_INVOCATION_FAILED errors are buried at lines ~48, ~113, ~184, ~251.
// Each error has a unique request ID in the format vrq_xxxxxx.
// All other content is plausible traffic noise.
// ─────────────────────────────────────────────────────────────────────────────

function ts(base, offsetSeconds) {
  return new Date(base + offsetSeconds * 1000).toISOString().replace('T', ' ').slice(0, 23) + 'Z';
}

function generateLog() {
  const BASE = new Date('2026-02-23T17:00:00.000Z').getTime();

  // The 4 buried request IDs — these are the answer
  const ERROR_IDS = ['vrq_7f3a2c', 'vrq_b8e91d', 'vrq_4509fa', 'vrq_cc2871'];

  const ROUTES = [
    ['GET',  '/api/puzzle/today',         200, 212],
    ['GET',  '/api/puzzle/today',         200, 198],
    ['POST', '/api/submit',               200, 334],
    ['GET',  '/api/leaderboard',          200, 178],
    ['GET',  '/api/leaderboard',          200, 191],
    ['GET',  '/',                         200,  44],
    ['GET',  '/archive',                  200,  89],
    ['GET',  '/docs',                     200,  67],
    ['POST', '/api/submit',               200, 412],
    ['GET',  '/api/puzzle/today',         200, 203],
    ['GET',  '/profile/turbo-solver',     200, 156],
    ['GET',  '/api/leaderboard',          200, 188],
    ['GET',  '/favicon.ico',              200,   8],
    ['GET',  '/robots.txt',               200,   5],
    ['GET',  '/llms.txt',                 200,  12],
    ['POST', '/api/submit',               200, 289],
    ['GET',  '/api/puzzle/today',         304,  18],
    ['GET',  '/api/leaderboard/global',   200, 167],
    ['GET',  '/',                         200,  41],
    ['GET',  '/archive',                  200,  92],
    ['POST', '/api/submit',               200, 445],
    ['GET',  '/api/puzzle/today',         200, 211],
    ['GET',  '/dashboard',                302,  23],
    ['GET',  '/api/auth/signin',          302,  31],
    ['GET',  '/api/puzzle/today',         200, 209],
    ['GET',  '/docs',                     200,  71],
    ['POST', '/api/submit',               429,  14],
    ['GET',  '/api/leaderboard',          200, 183],
    ['GET',  '/',                         200,  39],
    ['POST', '/api/submit',               200, 378],
  ];

  const SLOW_ROUTES = [
    ['POST', '/api/submit',               200, 2841],
    ['GET',  '/api/leaderboard',          200, 1923],
    ['POST', '/api/submit',               200, 3102],
  ];

  const lines = [];

  // Header block
  lines.push(`[${ts(BASE, 0)}] [INFO]  Deployment triggered: commit f1a978a — "puzzles: add 5 code_review puzzles"`);
  lines.push(`[${ts(BASE, 2)}] [INFO]  Build started — Node.js 22.x, Astro 5.17.0`);
  lines.push(`[${ts(BASE, 4)}] [INFO]  Installing dependencies (frozen lockfile)`);
  lines.push(`[${ts(BASE, 18)}] [INFO]  Build completed in 14.2s — 23 routes, 0 errors, 2 warnings`);
  lines.push(`[${ts(BASE, 19)}] [WARN]  Large page bundle: /leaderboard (187KB gzipped)`);
  lines.push(`[${ts(BASE, 19)}] [WARN]  Large page bundle: /docs (142KB gzipped)`);
  lines.push(`[${ts(BASE, 22)}] [INFO]  Deployment promoted to production: open-rank.com`);
  lines.push(`[${ts(BASE, 23)}] [INFO]  ─────────────────────────────────────────────`);
  lines.push(`[${ts(BASE, 23)}] [INFO]  Serving production traffic`);
  lines.push(`[${ts(BASE, 23)}] [INFO]  ─────────────────────────────────────────────`);

  let t = 45;  // seconds from base, start of live traffic

  function req(route, ms, reqId = null) {
    const [method, path, status, duration] = route;
    const d = ms !== undefined ? ms : duration;
    const tag = reqId ? ` [${reqId}]` : '';
    const lvl = status >= 500 ? '[ERROR]' : status === 429 ? '[WARN] ' : '[INFO] ';
    lines.push(`[${ts(BASE, t)}]${tag} ${lvl} ${method.padEnd(4)} ${path.padEnd(38)} ${status}  ${String(d).padStart(5)}ms`);
    t += Math.floor(d / 400) + 1;
  }

  function error(path, reqId) {
    lines.push(`[${ts(BASE, t)}] [ERROR] [${reqId}] FUNCTION_INVOCATION_FAILED: POST ${path}`);
    lines.push(`[${ts(BASE, t)}] [ERROR] [${reqId}] Error: Internal server error — upstream timeout after 10000ms`);
    lines.push(`[${ts(BASE, t)}] [ERROR] [${reqId}] Stack: processSubmission (api/submit.ts:158) → saltedHash (lib/hash.ts:9) → undefined`);
    t += 3;
  }

  // Block 1: normal traffic (lines 10–46)
  for (let i = 0; i < 12; i++) req(ROUTES[i % ROUTES.length]);
  req(SLOW_ROUTES[0]);
  for (let i = 12; i < 26; i++) req(ROUTES[i % ROUTES.length]);
  for (let i = 26; i < 37; i++) req(ROUTES[i % ROUTES.length]);

  // First error (~line 48)
  error('/api/submit', ERROR_IDS[0]);

  // Block 2: recovery + normal traffic (lines 51–110)
  lines.push(`[${ts(BASE, t)}] [INFO]  Auto-retry triggered for region iad1`);
  t += 1;
  for (let i = 0; i < 20; i++) req(ROUTES[i % ROUTES.length]);
  req(SLOW_ROUTES[1]);
  for (let i = 20; i < 38; i++) req(ROUTES[i % ROUTES.length]);
  lines.push(`[${ts(BASE, t)}] [INFO]  Rate limiter cleared: 12 expired entries pruned`);
  t += 1;
  for (let i = 0; i < 10; i++) req(ROUTES[i % ROUTES.length]);

  // Second error (~line 113)
  error('/api/submit', ERROR_IDS[1]);

  // Block 3: longer normal stretch (lines 116–181)
  lines.push(`[${ts(BASE, t)}] [WARN]  Response time p95 elevated: 1840ms (threshold: 1500ms)`);
  t += 1;
  for (let i = 0; i < 15; i++) req(ROUTES[i % ROUTES.length]);
  req(SLOW_ROUTES[2]);
  for (let i = 15; i < 30; i++) req(ROUTES[i % ROUTES.length]);
  lines.push(`[${ts(BASE, t)}] [INFO]  Cache warm: /api/puzzle/today TTL reset (midnight UTC)`);
  t += 1;
  for (let i = 30; i < 50; i++) req(ROUTES[i % ROUTES.length]);

  // Third error (~line 184)
  error('/api/submit', ERROR_IDS[2]);

  // Block 4: high traffic window (lines 187–248)
  lines.push(`[${ts(BASE, t)}] [INFO]  Traffic spike detected: 42 req/min (baseline: 18 req/min)`);
  t += 1;
  for (let i = 0; i < 18; i++) req(ROUTES[i % ROUTES.length]);
  lines.push(`[${ts(BASE, t)}] [WARN]  Supabase connection pool: 18/20 connections in use`);
  t += 1;
  for (let i = 18; i < 36; i++) req(ROUTES[i % ROUTES.length]);
  lines.push(`[${ts(BASE, t)}] [INFO]  Supabase connection pool: 9/20 connections in use`);
  t += 1;
  for (let i = 0; i < 22; i++) req(ROUTES[i % ROUTES.length]);

  // Fourth error (~line 251)
  error('/api/submit', ERROR_IDS[3]);

  // Block 5: tail — system stabilises (lines 254–278)
  lines.push(`[${ts(BASE, t)}] [INFO]  Circuit breaker OPEN: /api/submit rate of failure exceeded threshold`);
  t += 1;
  lines.push(`[${ts(BASE, t)}] [INFO]  Redeploying last known good build: 87fce23`);
  t += 14;
  lines.push(`[${ts(BASE, t)}] [INFO]  Deployment complete — rollback active`);
  t += 1;
  for (let i = 0; i < 15; i++) req(ROUTES[i % ROUTES.length]);
  lines.push(`[${ts(BASE, t)}] [INFO]  Incident closed. Duration: 68 minutes. Root cause: upstream timeout in saltedHash`);
  lines.push(`[${ts(BASE, t)}] [INFO]  ─────────────────────────────────────────────`);
  lines.push(`[${ts(BASE, t)}] [INFO]  End of incident window`);
  lines.push(`[${ts(BASE, t)}] [INFO]  ─────────────────────────────────────────────`);

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Puzzle definition
// ─────────────────────────────────────────────────────────────────────────────

const logContent = generateLog();
const lineCount = logContent.split('\n').length;
console.log(`Generated log: ${lineCount} lines`);

const puzzle = {
  id: randomUUID(),
  title: 'The Incident Log',
  difficulty: 'medium',
  category: 'long_context',
  release_date: '2026-04-02',
  description: `A production incident occurred on \`open-rank.com\` over a 68-minute window. The log below captures the full deployment and traffic activity during that period.

Four requests failed with \`FUNCTION_INVOCATION_FAILED\`. Each failed request has a unique request ID in the format \`vrq_xxxxxx\`.

List the **request IDs of all four failed requests** in the order they appear in the log, comma-separated.

Example format: \`vrq_aaaaaa,vrq_bbbbbb,vrq_cccccc,vrq_dddddd\``,
  input_data: logContent,
  answer: 'vrq_7f3a2c,vrq_b8e91d,vrq_4509fa,vrq_cc2871',
};

// ─────────────────────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────────────────────

const { answer, ...puzzleData } = puzzle;
const answerHash = saltedHash(answer.trim(), puzzle.id);

console.log(`\n🧩 Seeding: ${puzzle.title} (${puzzle.release_date})`);
console.log(`   Lines: ${lineCount} | Answer: "${answer}" | Hash: ${answerHash.slice(0, 8)}...`);

const { ok, status, data } = await supaFetch('/puzzles', {
  method: 'POST',
  headers: { Prefer: 'return=minimal' },
  body: JSON.stringify({ ...puzzleData, answer_hash: answerHash }),
});

if (ok) {
  console.log(`\n✅ "${puzzle.title}" seeded for ${puzzle.release_date}\n`);
} else {
  console.error(`\n❌ HTTP ${status}:`, JSON.stringify(data));
  process.exit(1);
}
