#!/usr/bin/env node
/**
 * Seed the first Agentic Engineering puzzle — based on a real CSS/grid bug debugged live.
 * Run from project root: node scripts/seed-agentic-engineering-puzzles.mjs
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
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SERVICE_ROLE_KEY;

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
// PUZZLE 1: The Overflowing Grid
// Bug: overflow-x: hidden on a grid item destroys grid layout (collapses columns).
// Fix: min-width: 0 on the grid item, which prevents the grid item from
//      overflowing its track without hiding content.
// Answer: min-width: 0
// ─────────────────────────────────────────────────────────────────────────────
const p1 = {
  id: randomUUID(),
  title: 'The Overflowing Grid',
  difficulty: 'medium',
  category: 'agentic_engineering',
  release_date: '2026-04-03',
  description: `A developer is building a puzzle platform. One puzzle page shows a **two-column layout**: a wide main content area on the left and a sticky sidebar on the right.

A user reports horizontal scrolling on one puzzle because the input data \`<pre>\` block has very long lines. The developer adds this fix:

\`\`\`css
body {
  overflow-x: hidden;
}

.puzzle-main {
  overflow-x: hidden;
}
\`\`\`

The horizontal scroll is gone — but now the entire page layout is broken. Everything stacks vertically like a list. The sidebar has collapsed. The two-column grid is gone.

**Your task:** The developer should remove both \`overflow-x: hidden\` declarations. What single CSS property and value (in \`property: value\` format) should be added to \`.puzzle-main\` instead — to prevent the grid item from overflowing its column without hiding any overflow?

The relevant CSS context:
\`\`\`css
.puzzle-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
}

.puzzle-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  /* your fix goes here */
}

pre {
  max-width: 100%;
  overflow-x: auto;
}
\`\`\`

*Hint: CSS Grid items have a default minimum size that can cause them to overflow their track.*`,
  input_data: `The page uses CSS Grid: grid-template-columns: 1fr 320px
The .puzzle-main item contains a <pre> block with lines up to 3,000 characters long.
The .puzzle-sidebar has position: sticky.

Broken fix applied:
  body { overflow-x: hidden; }
  .puzzle-main { overflow-x: hidden; }

Result: two-column layout collapsed to single column. Sidebar lost sticky behavior.

Your answer should be a CSS property: value pair (e.g., "display: block").
The correct answer fixes the grid item overflow without hiding any overflow.`,
  answer: 'min-width: 0',
};

// ─────────────────────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────────────────────
const puzzles = [p1];

console.log('\n🛠️  Seeding Agentic Engineering puzzles...\n');

for (const puzzle of puzzles) {
  const { answer, ...puzzleData } = puzzle;
  const answerHash = saltedHash(answer.trim(), puzzle.id);

  console.log(`Puzzle ID:    ${puzzle.id}`);
  console.log(`Answer hash:  ${answerHash}`);

  const { ok, status, data } = await supaFetch('/puzzles', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...puzzleData, answer_hash: answerHash }),
  });

  if (ok) {
    console.log(`✅ [${puzzle.release_date}] ${puzzle.title} (answer: "${answer}", hash: ${answerHash.slice(0,8)}...)`);
  } else {
    console.error(`❌ [${puzzle.release_date}] ${puzzle.title} — HTTP ${status}:`, JSON.stringify(data));
    process.exit(1);
  }
}

console.log('\n✨ Done.\n');
