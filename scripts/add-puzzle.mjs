#!/usr/bin/env node
/**
 * AgentArena — Add Puzzle CLI
 * Interactively create and seed a single puzzle.
 *
 * Usage (interactive):
 *   node scripts/add-puzzle.mjs
 *
 * Usage (with flags — omitted flags will be prompted):
 *   node scripts/add-puzzle.mjs \
 *     --title "My Puzzle" \
 *     --date 2026-03-28 \
 *     --difficulty medium
 */

import { readFileSync, createReadStream } from 'fs';
import { createHash, randomUUID } from 'crypto';
import { createInterface } from 'readline';

// ─── Load credentials ─────────────────────────────────────────────────────────
const envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(l => l.includes('=') && !l.trimStart().startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL     = env.SUPABASE_URL;
const ANSWER_SALT      = env.ANSWER_SALT;
const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANSWER_SALT || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing credentials. .env.local needs SUPABASE_URL, ANSWER_SALT, SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function saltedHash(answer, puzzleId) {
  return createHash('sha256')
    .update(`${answer}:${puzzleId}:${ANSWER_SALT}`)
    .digest('hex');
}

// Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
    }
  }
  return flags;
}

// Readline prompt helper — supports multi-line input ending with a blank line
function createRL() {
  return createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

async function askMultiline(rl, question) {
  console.log(question);
  console.log('(Enter your text. Finish with a blank line.)');
  const lines = [];
  let blank = false;
  for await (const line of rl) {
    if (line === '') {
      if (lines.length > 0) break; // done
    } else {
      lines.push(line);
      blank = false;
    }
  }
  return lines.join('\n');
}

function validateDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'];

// ─── Supabase POST ────────────────────────────────────────────────────────────
async function seedPuzzle(puzzle) {
  const { answer, ...rest } = puzzle;
  const answer_hash = saltedHash(answer, puzzle.id);
  const payload = { ...rest, answer_hash };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/puzzles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  return { ok: res.ok || res.status === 201 || res.status === 200, status: res.status, body };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const flags = parseArgs();

if (flags.help || flags.h) {
  console.log(`
AgentArena — Add Puzzle CLI

Usage:
  node scripts/add-puzzle.mjs [options]

Options:
  --title        Puzzle title (short, evocative)
  --date         Release date (YYYY-MM-DD)
  --difficulty   easy | medium | hard | insane
  --dry-run      Preview without seeding

All omitted fields will be prompted interactively.
Multi-line fields (description, input_data) are entered in the terminal;
finish each with a blank line.
`);
  process.exit(0);
}

console.log('\n🧩  AgentArena — Add Puzzle\n');

const rl = createRL();
rl.on('close', () => {});

// Collect all fields
let title = flags.title;
let date  = flags.date;
let difficulty = flags.difficulty;

// Prompt for missing simple fields
if (!title) {
  title = await ask(rl, 'Title: ');
}

if (!date) {
  date = await ask(rl, 'Release date (YYYY-MM-DD): ');
}
while (!validateDate(date)) {
  console.log('  Invalid date format. Use YYYY-MM-DD.');
  date = await ask(rl, 'Release date (YYYY-MM-DD): ');
}

if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
  difficulty = await ask(rl, 'Difficulty (easy/medium/hard/insane): ');
  while (!VALID_DIFFICULTIES.includes(difficulty)) {
    console.log(`  Must be one of: ${VALID_DIFFICULTIES.join(', ')}`);
    difficulty = await ask(rl, 'Difficulty: ');
  }
}

// Multi-line fields — always prompted interactively
console.log('\n--- Description ---');
console.log('Describe the puzzle clearly. Include the answer format at the end.');
console.log('Finish with a blank line.\n');
const descLines = [];
let prevBlank = false;
// Use a custom async iterator over rl
let descDone = false;
for await (const line of rl) {
  if (line === '') {
    if (descLines.length > 0) { descDone = true; break; }
  } else {
    descLines.push(line);
    prevBlank = false;
  }
}
const description = descLines.join('\n');

console.log('\n--- Input Data ---');
console.log('Paste the puzzle data (CSV, JSON, sequence, etc.).');
console.log('Finish with a blank line.\n');
const inputLines = [];
for await (const line of rl) {
  if (line === '') {
    if (inputLines.length > 0) break;
  } else {
    inputLines.push(line);
  }
}
const input_data = inputLines.join('\n');

console.log('\n--- Answer ---');
const answer = await ask(rl, 'Correct answer (plaintext, exactly as submitted): ');

rl.close();

// Generate UUID
const id = randomUUID();

const puzzle = {
  id,
  title,
  description,
  difficulty,
  input_data,
  answer,
  release_date: date,
};

// Preview
console.log('\n─────────────────────────────────────────');
console.log('📋  Puzzle Preview\n');
console.log(`  ID:          ${id}`);
console.log(`  Title:       ${title}`);
console.log(`  Date:        ${date}`);
console.log(`  Difficulty:  ${difficulty}`);
console.log(`  Answer:      ${answer}`);
console.log(`  Answer hash: ${saltedHash(answer, id)}`);
console.log('\n  Description (first 200 chars):');
console.log('  ' + description.slice(0, 200).replace(/\n/g, '\n  '));
console.log('\n  Input data (first 200 chars):');
console.log('  ' + input_data.slice(0, 200).replace(/\n/g, '\n  '));
console.log('─────────────────────────────────────────\n');

if (flags['dry-run']) {
  console.log('Dry run — not seeding.\n');
  process.exit(0);
}

// Confirm
const confirmRL = createInterface({ input: process.stdin, output: process.stdout });
const confirm = await new Promise(resolve =>
  confirmRL.question('Seed this puzzle? (y/N): ', a => { confirmRL.close(); resolve(a.trim().toLowerCase()); })
);

if (confirm !== 'y' && confirm !== 'yes') {
  console.log('Aborted.\n');
  process.exit(0);
}

console.log('\n🌱  Seeding...');
const result = await seedPuzzle(puzzle);

if (result.ok) {
  console.log(`\n✅  Puzzle seeded successfully!`);
  console.log(`   ID:    ${id}`);
  console.log(`   Title: ${title}`);
  console.log(`   Date:  ${date}\n`);
} else {
  console.error(`\n❌  Seeding failed — HTTP ${result.status}: ${result.body}\n`);
  process.exit(1);
}
