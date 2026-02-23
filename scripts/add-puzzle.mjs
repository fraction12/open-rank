#!/usr/bin/env node
// scripts/add-puzzle.mjs — OpenRank Puzzle Admin CLI
import { createHash, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import * as readline from 'readline/promises';

// Load credentials from .env.local
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
const SERVICE_KEY = env.SERVICE_ROLE_KEY;

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

// --list
if (process.argv.includes('--list')) {
  const { data } = await supaFetch('/puzzles?select=id,title,difficulty,release_date&order=release_date.asc');
  console.table(data);
  process.exit(0);
}

// --delete <id>
const delIdx = process.argv.indexOf('--delete');
if (delIdx !== -1) {
  const id = process.argv[delIdx + 1];
  const { ok } = await supaFetch(`/puzzles?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  console.log(ok ? `✅ Deleted ${id}` : `❌ Failed to delete ${id}`);
  process.exit(ok ? 0 : 1);
}

// Interactive add
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('\n🧩 OpenRank — Add New Puzzle\n');

const title = await rl.question('Title: ');
const difficulty = await rl.question('Difficulty (easy/medium/hard/insane): ');
const releaseDate = await rl.question('Release date (YYYY-MM-DD): ');
console.log('Description (paste, then type END on a new line):');

let description = '';
for await (const line of rl) {
  if (line.trim() === 'END') break;
  description += line + '\n';
}

console.log('Input data (paste, then type END on a new line):');
let inputData = '';
for await (const line of rl) {
  if (line.trim() === 'END') break;
  inputData += line + '\n';
}

const answer = await rl.question('Correct answer (exact string): ');
rl.close();

const id = randomUUID();
const answerHash = saltedHash(answer.trim(), id);

console.log(`\nPuzzle ID: ${id}`);
console.log(`Answer hash: ${answerHash}`);
console.log('\nSeeding to Supabase...');

const { ok, status, data } = await supaFetch('/puzzles', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ id, title, difficulty, release_date: releaseDate, description: description.trim(), input_data: inputData.trim(), answer_hash: answerHash }),
});

if (ok) {
  console.log(`✅ Puzzle "${title}" seeded for ${releaseDate}`);
} else {
  console.error(`❌ Error ${status}:`, data);
  process.exit(1);
}
