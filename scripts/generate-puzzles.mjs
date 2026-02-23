/**
 * Puzzle data generator for AgentArena seed puzzles
 * Run: node scripts/generate-puzzles.mjs
 */

import { createHash } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

// ─────────────────────────────────────────────
// PUZZLE 1: Needle in the Haystack
// ─────────────────────────────────────────────

const LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const PAYLOADS = [
  'user login attempt succeeded',
  'cache miss for key user_profile_',
  'database query executed in',
  'request processed successfully',
  'rate limit applied to',
  'connection pool exhausted temporarily',
  'background job completed',
  'configuration reloaded from',
  'session expired for user',
  'health check passed',
  'file uploaded to bucket',
  'email dispatched to queue',
  'webhook received from',
  'payment processed for order',
  'index rebuild triggered on',
];

function randomPayload(i) {
  return PAYLOADS[i % PAYLOADS.length] + ' ' + Math.floor(Math.random() * 999999).toString().padStart(6, '0');
}

function generateLogLines(count) {
  const lines = [];
  const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
  for (let i = 0; i < count; i++) {
    const ts = new Date(baseTime + i * 3000).toISOString();
    const level = LEVELS[i % LEVELS.length];
    const payload = randomPayload(i);
    const checksum = sha256(payload).slice(0, 6);
    lines.push({ ts, level, checksum, payload });
  }
  return lines;
}

// Generate 10,000 log lines
const logLines = generateLogLines(10000);

// Pick 3 random lines to corrupt (use fixed seeds for reproducibility)
const corruptedLines = [1042, 5891, 7234]; // 1-indexed
corruptedLines.forEach(lineNum => {
  const i = lineNum - 1;
  // Set an obviously wrong checksum
  logLines[i].checksum = 'BADC0D';
});

// Write the puzzle file
const puzzleContent = logLines
  .map(l => `[${l.ts}] [${l.level}] [checksum:${l.checksum}] ${l.payload}`)
  .join('\n');

mkdirSync(join(ROOT, 'public/puzzles'), { recursive: true });
writeFileSync(join(ROOT, 'public/puzzles/001-needle.txt'), puzzleContent);
console.log('✅ Written public/puzzles/001-needle.txt');

const puzzle1Answer = corruptedLines.join(',');
const puzzle1AnswerHash = sha256(puzzle1Answer);
console.log('Puzzle 1 answer:', puzzle1Answer);
console.log('Puzzle 1 hash:', puzzle1AnswerHash);

// ─────────────────────────────────────────────
// PUZZLE 2: Pattern Decoder
// ─────────────────────────────────────────────

// Fibonacci helper
function fib(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) { [a, b] = [b, a + b]; }
  return b;
}

// Rule: each number = (sum of digits of previous) * position mod 97 + fib(position mod 20)
// position is 1-indexed
function sumDigits(n) {
  return Math.abs(n).toString().split('').reduce((s, d) => s + parseInt(d), 0);
}

const sequence = [7]; // starting seed
for (let pos = 2; pos <= 1000; pos++) {
  const prev = sequence[sequence.length - 1];
  const next = (sumDigits(prev) * pos) % 97 + fib(pos % 20);
  sequence.push(next);
}

const puzzle2Input = sequence.slice(0, 990).join(',');
const puzzle2Answer = sequence.slice(990, 1000).join(',');
const puzzle2AnswerHash = sha256(puzzle2Answer);

console.log('\nPuzzle 2 answer:', puzzle2Answer);
console.log('Puzzle 2 hash:', puzzle2AnswerHash);
console.log('Puzzle 2 first 10 of input:', sequence.slice(0, 10).join(','));

// ─────────────────────────────────────────────
// PUZZLE 3: The Broken Cipher
// ─────────────────────────────────────────────

const PLAINTEXT = `In the beginning was the Word and the Word was with God and the Word was God. The same was in the beginning with God. All things were made by him and without him was not any thing made that was made. In him was life and the life was the light of men. And the light shineth in darkness and the darkness comprehended it not. There was a man sent from God whose name was John. The same came for a witness to bear witness of the Light that all men through him might believe. He was not that Light but was sent to bear witness of that Light. That was the true Light which lighteth every man that cometh into the world.`;

// Repeat/pad to 5000 chars
let plainPadded = '';
while (plainPadded.length < 5000) plainPadded += PLAINTEXT + ' ';
plainPadded = plainPadded.slice(0, 5000);

// Step 1: Caesar cipher (shift +13, ROT13) - letters only
function caesar(text, shift) {
  return text.split('').map(c => {
    if (c >= 'a' && c <= 'z') return String.fromCharCode(((c.charCodeAt(0) - 97 + shift) % 26) + 97);
    if (c >= 'A' && c <= 'Z') return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65);
    return c;
  }).join('');
}

// Step 2: Columnar transposition with key "AGENTS" (sorted: A=0,E=1,G=2,N=3,S=4,T=5)
// Key: A=0, E=1, G=2, N=3, S=4, T=5
// Column order by alphabetical position: A(0),E(1),G(2),N(3),S(4),T(5) → read columns in order 0,1,2,3,4,5
const TRANS_KEY = 'AGENTS';
const TRANS_COLS = TRANS_KEY.length; // 6

function transposeEncrypt(text, cols) {
  // Pad to multiple of cols
  const padded = text.padEnd(Math.ceil(text.length / cols) * cols, 'X');
  const rows = padded.length / cols;
  // Get sort order of key
  const keyOrder = TRANS_KEY.split('').map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c)).map(x => x.i);
  // Read off columns in sorted key order
  let result = '';
  for (const col of keyOrder) {
    for (let row = 0; row < rows; row++) {
      result += padded[row * cols + col];
    }
  }
  return result;
}

// Step 3: Simple substitution cipher
// Map each letter to a different one using a fixed alphabet
const SUB_ALPHABET = 'ZYXWVUTSRQPONMLKJIHGFEDCBA'; // reverse alphabet
function substitution(text) {
  return text.split('').map(c => {
    if (c >= 'a' && c <= 'z') return SUB_ALPHABET[c.charCodeAt(0) - 97].toLowerCase();
    if (c >= 'A' && c <= 'Z') return SUB_ALPHABET[c.charCodeAt(0) - 65];
    return c;
  }).join('');
}

// Encrypt: Caesar → Transpose → Substitute
const afterCaesar = caesar(plainPadded, 13);
const afterTranspose = transposeEncrypt(afterCaesar, TRANS_COLS);
const ciphertext = substitution(afterTranspose);

// The puzzle describes the algorithm with ONE step incorrectly:
// We say the Caesar shift is +7 (WRONG — it's actually +13)
// The puzzle is: figure out which step is wrong and decrypt

const puzzle3Answer = plainPadded.slice(0, 50);
const puzzle3AnswerHash = sha256(puzzle3Answer);
console.log('\nPuzzle 3 plaintext (first 50):', puzzle3Answer);
console.log('Puzzle 3 hash:', puzzle3AnswerHash);
console.log('Ciphertext length:', ciphertext.length);
console.log('Ciphertext (first 100):', ciphertext.slice(0, 100));

// ─────────────────────────────────────────────
// Write seed-puzzles.ts
// ─────────────────────────────────────────────

const seedTs = `// AUTO-GENERATED by scripts/generate-puzzles.mjs
// DO NOT EDIT MANUALLY

export type SeedPuzzle = {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  input_data: string;
  answer_hash: string;
  release_date: string;
};

export const seedPuzzles: SeedPuzzle[] = [
  {
    title: 'Needle in the Haystack',
    difficulty: 'medium',
    release_date: '2026-02-23',
    answer_hash: '${puzzle1AnswerHash}',
    description: \`You have been given 10,000 server log lines. Each line has the format:

  [timestamp] [level] [checksum:xxxxxx] payload text

The checksum field should contain the first 6 hex characters of the SHA-256 hash of the payload text. However, someone tampered with exactly 3 log lines and changed their checksum to an incorrect value.

Your task: find the 3 line numbers (1-indexed) where the checksum does NOT match SHA-256(payload)[0:6]. Return them sorted ascending, comma-separated.

Example answer format: 1042,5891,7234

Download the log file: /puzzles/001-needle.txt (10,000 lines)\`,
    input_data: '/puzzles/001-needle.txt',
  },
  {
    title: 'Pattern Decoder',
    difficulty: 'easy',
    release_date: '2026-02-24',
    answer_hash: '${puzzle2AnswerHash}',
    description: \`A sequence of numbers follows a hidden mathematical rule. Your task is to figure out the rule and predict the next 10 numbers.

The sequence starts with: 7

Rule hint: Each number depends on the previous number and its position in the sequence.

You are given the first 990 numbers. Return the next 10 numbers, comma-separated.

Example answer format: 42,17,93,8,55,21,64,33,79,12\`,
    input_data: ${JSON.stringify(puzzle2Input)},
  },
  {
    title: 'The Broken Cipher',
    difficulty: 'hard',
    release_date: '2026-02-25',
    answer_hash: '${puzzle3AnswerHash}',
    description: \`A message has been encrypted using a 3-step process. One of the steps has been described incorrectly — your job is to identify which step is wrong, correct it, and decrypt the message.

## Claimed Encryption Process

**Step 1: Caesar Cipher**
Each letter is shifted forward by **7 positions** in the alphabet. Non-letter characters are unchanged.

**Step 2: Columnar Transposition**
The text is written into rows of 6 characters. The columns are then read out in the order determined by sorting the key "AGENTS" alphabetically (A=0, E=1, G=2, N=3, S=4, T=5).

**Step 3: Substitution Cipher**
Each letter is replaced using a reversed alphabet (A↔Z, B↔Y, C↔X, ...).

## Your Task
One of the three steps above has an incorrect parameter. Identify it, fix it, and decrypt the ciphertext.

Return the **first 50 characters** of the decrypted plaintext exactly as they appear.

## Ciphertext (5000 characters)
\${${JSON.stringify(ciphertext)}}\`,
  },
];
`;

writeFileSync(join(ROOT, 'src/data/seed-puzzles.ts'), seedTs);
console.log('\n✅ Written src/data/seed-puzzles.ts');
console.log('\nDone! All puzzle data generated.');
