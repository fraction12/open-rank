#!/usr/bin/env node
/**
 * AgentArena — Puzzle Seeder
 * Seeds 30 puzzles (Feb 26 → Mar 27, 2026) into Supabase.
 *
 * Usage:
 *   node scripts/seed-puzzles.mjs            # seed all
 *   node scripts/seed-puzzles.mjs --dry-run  # print without seeding
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

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
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANSWER_SALT || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing credentials. .env.local needs SUPABASE_URL, ANSWER_SALT, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─── Hashing ──────────────────────────────────────────────────────────────────
function saltedHash(answer, puzzleId) {
  return createHash('sha256')
    .update(`${answer}:${puzzleId}:${ANSWER_SALT}`)
    .digest('hex');
}

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
  if (res.ok || res.status === 201 || res.status === 200) {
    console.log(`  ✅  [${puzzle.release_date}] ${puzzle.title} (${puzzle.difficulty})`);
    return true;
  } else {
    console.error(`  ❌  [${puzzle.release_date}] ${puzzle.title} — HTTP ${res.status}: ${body}`);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PRE-COMPUTED PUZZLE DATA
// ════════════════════════════════════════════════════════════════════════════════

// ── Puzzle 7: API event digit-sum checksum ────────────────────────────────────
function digitSum(n) {
  return String(Math.abs(n)).split('').reduce((s, d) => s + parseInt(d), 0);
}

function buildEventData() {
  const events = [
    { id: 'EVT-001', value: 48392 },
    { id: 'EVT-002', value: 71056 },
    { id: 'EVT-003', value: 33847 }, // correct sum=25, stored=22  ← CORRUPT
    { id: 'EVT-004', value: 90213 },
    { id: 'EVT-005', value: 62758 },
    { id: 'EVT-006', value: 15934 },
    { id: 'EVT-007', value: 88001 },
    { id: 'EVT-008', value: 43679 },
    { id: 'EVT-009', value: 27485 }, // correct sum=26, stored=16  ← CORRUPT
    { id: 'EVT-010', value: 59120 },
    { id: 'EVT-011', value: 81347 },
    { id: 'EVT-012', value: 64893 },
    { id: 'EVT-013', value: 37265 },
    { id: 'EVT-014', value: 92047 },
    { id: 'EVT-015', value: 15386 }, // correct sum=23, stored=31  ← CORRUPT
    { id: 'EVT-016', value: 70934 },
    { id: 'EVT-017', value: 48712 },
    { id: 'EVT-018', value: 63015 },
    { id: 'EVT-019', value: 29847 },
    { id: 'EVT-020', value: 51639 },
  ];
  const corrupt = { 'EVT-003': 22, 'EVT-009': 16, 'EVT-015': 31 };
  return events.map(e => {
    const correct = digitSum(e.value) % 100;
    const stored  = corrupt[e.id] ?? correct;
    return `${e.id},${e.value},${stored}`;
  }).join('\n');
}

// ── Puzzle 12: Network packet checksum ───────────────────────────────────────
function buildPacketData() {
  const pkts = [
    { id: 'PKT-001', seq: 1,  size: 512  },
    { id: 'PKT-002', seq: 2,  size: 1024 },
    { id: 'PKT-003', seq: 3,  size: 256  },
    { id: 'PKT-004', seq: 4,  size: 768  },
    { id: 'PKT-005', seq: 5,  size: 1280 },
    { id: 'PKT-006', seq: 6,  size: 512  }, // correct=66, stored=99   ← CORRUPT
    { id: 'PKT-007', seq: 7,  size: 896  },
    { id: 'PKT-008', seq: 8,  size: 256  },
    { id: 'PKT-009', seq: 9,  size: 1024 },
    { id: 'PKT-010', seq: 10, size: 640  },
    { id: 'PKT-011', seq: 11, size: 384  },
    { id: 'PKT-012', seq: 12, size: 768  },
    { id: 'PKT-013', seq: 13, size: 512  }, // correct=143,stored=42   ← CORRUPT
    { id: 'PKT-014', seq: 14, size: 1024 },
    { id: 'PKT-015', seq: 15, size: 256  },
    { id: 'PKT-016', seq: 16, size: 896  },
    { id: 'PKT-017', seq: 17, size: 640  },
    { id: 'PKT-018', seq: 18, size: 384  },
    { id: 'PKT-019', seq: 19, size: 1280 },
    { id: 'PKT-020', seq: 20, size: 768  },
    { id: 'PKT-021', seq: 21, size: 512  }, // correct=231,stored=17   ← CORRUPT
    { id: 'PKT-022', seq: 22, size: 1024 },
    { id: 'PKT-023', seq: 23, size: 256  },
    { id: 'PKT-024', seq: 24, size: 896  },
    { id: 'PKT-025', seq: 25, size: 640  },
    { id: 'PKT-026', seq: 26, size: 384  },
    { id: 'PKT-027', seq: 27, size: 512  }, // correct=41, stored=88   ← CORRUPT
    { id: 'PKT-028', seq: 28, size: 1024 },
    { id: 'PKT-029', seq: 29, size: 256  },
    { id: 'PKT-030', seq: 30, size: 768  },
  ];
  const corrupt = { 'PKT-006': 99, 'PKT-013': 42, 'PKT-021': 17, 'PKT-027': 88 };
  const rows = pkts.map(p => {
    const correct = (p.seq * 11 + p.size) % 256;
    const stored  = corrupt[p.id] ?? correct;
    return `${p.id},${p.seq},${p.size},${stored}`;
  });
  return ['packet_id,seq_num,size_bytes,checksum', ...rows].join('\n');
}

// ── Puzzle 24: Steganography ─────────────────────────────────────────────────
// Every 25th alphabetic character (positions 25,50,...,300) spells CRACKTHECODE
function buildStegoText() {
  const targets = 'CRACKTHECODE'.split('');
  const base =
    'THEQUICKBROWNFOXJUMPEDOVERLAZYDOGWHILEAGENTSSCOUTEDFORTHECLUESNE' +
    'EDINGCAREFULEXAMINATIONOFEVERYSINGLEDETAILTOFINDWHATWASLOOKINGAT' +
    'THEMOSTIMPORTANTPIECEOFINFORMATIONHIDDENWITHINTHISLARGEAMOUNTOF' +
    'DATATHATHADBEENCAREFULLYPREPAREDBYTHEMOSTCLEVERMINDSAVAILABLETO' +
    'THEORGANIZATIONSECRETMISSIONBEGANATDAWNWHENBRAVELYSCOUTING';

  const letters = [];
  let targetIdx = 0;
  let letterCount = 0;
  let baseIdx = 0;

  while (letterCount < 300) {
    letterCount++;
    if (letterCount % 25 === 0) {
      letters.push(targets[targetIdx++]);
    } else {
      while (baseIdx < base.length && !/[A-Z]/.test(base[baseIdx])) baseIdx++;
      letters.push(baseIdx < base.length ? base[baseIdx++] : 'X');
    }
  }

  let text = '';
  for (let i = 0; i < letters.length; i++) {
    text += letters[i];
    if ((i + 1) % 10 === 0) text += ' ';
  }
  return text.trim();
}

// ── Puzzle 30: Final Reckoning ───────────────────────────────────────────────
function buildFinalData() {
  const missingNum = 37;
  const all = Array.from({ length: 50 }, (_, i) => i + 1).filter(n => n !== missingNum);
  // Deterministic shuffle (LCG)
  for (let i = all.length - 1; i > 0; i--) {
    const j = (i * 1103515245 + 12345) % (i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  const primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47];
  const primeSum = primes.reduce((a, b) => a + b, 0); // 328
  return {
    data:      all.join(','),
    missingNum,
    primeSum,
    answer:    String(missingNum + primeSum), // 365
  };
}

// ── Puzzle 26: Prime constellation sum ───────────────────────────────────────
function computePuzzle26Answer() {
  const p = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71];
  let sum = 0;
  for (let n = 1; n <= 20; n++) {
    sum += n % 2 === 1 ? p[n-1] : (p[n-2] * p[n-1]) % 1000;
  }
  return String(sum); // 4234
}

// ─── Build all computed data ──────────────────────────────────────────────────
const eventData   = buildEventData();
const packetData  = buildPacketData();
const stegoText   = buildStegoText();
const final30     = buildFinalData();
const p26Answer   = computePuzzle26Answer();

// ════════════════════════════════════════════════════════════════════════════════
// THE 30 PUZZLES (Feb 26 → Mar 27, 2026)
// Distribution: easy×8, medium×12, hard×8, insane×2
// ════════════════════════════════════════════════════════════════════════════════
const puzzles = [

  // ══ 1 · Feb 26 · easy · Type B ─────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0001-4d5e-8f9a-000000000001',
    title: 'Squares in Disguise',
    difficulty: 'easy',
    release_date: '2026-02-26',
    description: `A sequence is generated by the rule: **a(n) = n² mod 97**

You are given the first 15 terms:
\`1, 4, 9, 16, 25, 36, 49, 64, 81, 3, 24, 47, 72, 2, 31\`

**Your task:** Compute the next 5 terms (n = 16 through n = 20).

**Answer format:** 5 integers, comma-separated, no spaces.
Example: 11,22,33,44,55`,
    input_data: '1,4,9,16,25,36,49,64,81,3,24,47,72,2,31',
    answer: '62,95,33,70,12',
  },

  // ══ 2 · Feb 27 · medium · Type A ───────────────────────────────────────────
  {
    id: 'f1a2b3c4-0002-4d5e-8f9a-000000000002',
    title: 'Salary Ceiling Breach',
    difficulty: 'medium',
    release_date: '2026-02-27',
    description: `You have been given a payroll CSV. Each role has a strict salary cap:

| Role      | Max Salary |
|-----------|-----------|
| junior    | $75,000   |
| mid       | $100,000  |
| senior    | $130,000  |
| principal | $175,000  |
| director  | $250,000  |

**Your task:** Find all employee IDs where salary **strictly exceeds** (>) the cap for their role.

**Answer format:** IDs sorted alphabetically, comma-separated.
Example: EMP-003,EMP-011`,
    input_data: `employee_id,name,role,salary
EMP-001,Sarah Chen,junior,68000
EMP-002,James Park,mid,95000
EMP-003,Lisa Wong,senior,128000
EMP-004,Michael Torres,principal,165000
EMP-005,Emily Davis,director,240000
EMP-006,Ryan Kim,junior,73000
EMP-007,Aisha Johnson,mid,105000
EMP-008,Carlos Rivera,senior,125000
EMP-009,Priya Patel,principal,170000
EMP-010,Daniel Lee,mid,88000
EMP-011,Sophie Martin,junior,71000
EMP-012,Omar Hassan,senior,118000
EMP-013,Yuki Tanaka,junior,82000
EMP-014,Elena Kozlov,principal,168000
EMP-015,Marcus Williams,director,245000
EMP-016,Fatima Al-Rashid,mid,97000
EMP-017,Andrew Chen,senior,122000
EMP-018,Isabella Santos,junior,69000
EMP-019,Kevin O'Brien,principal,185000
EMP-020,Mei Lin Zhang,mid,93000
EMP-021,David Okonkwo,senior,127000
EMP-022,Natasha Volkov,mid,108000
EMP-023,Raj Sharma,junior,74000
EMP-024,Claire Beaumont,principal,172000
EMP-025,Hassan Ibrahim,director,238000`,
    answer: 'EMP-007,EMP-013,EMP-019,EMP-022',
  },

  // ══ 3 · Feb 28 · easy · Type C ─────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0003-4d5e-8f9a-000000000003',
    title: 'Shifted Signal',
    difficulty: 'easy',
    release_date: '2026-02-28',
    description: `The following message was encoded using a **Caesar cipher with shift +5** (each letter shifted 5 places forward; non-letters unchanged).

Decode the message and return the **hidden animal name** (one uppercase word).

**Ciphertext:**
\`YMJ MNIIJS BTWI NX GQFHPGNWI\`

**Answer format:** One word, uppercase.
Example: FLAMINGO`,
    input_data: 'YMJ MNIIJS BTWI NX GQFHPGNWI',
    answer: 'BLACKBIRD',
  },

  // ══ 4 · Mar 1 · medium · Type E ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0004-4d5e-8f9a-000000000004',
    title: 'Model Assignment',
    difficulty: 'medium',
    release_date: '2026-03-01',
    description: `Four AI agents — **Apex, Blaze, Cipher, Drift** — each use a different LLM and each specializes in a different task.

**Models:** GPT-4o (OpenAI), Claude-3.5 (Anthropic), Gemini-1.5 (Google), Llama-3.1 (Meta)
**Specialties:** code, math, vision, language

**Clues:**
1. Apex does not use a Google or Meta model.
2. The agent specializing in **code** uses a Meta model.
3. Cipher's model provider is not Anthropic or Google.
4. The agent using **Gemini-1.5** specializes in language.
5. Drift does not specialize in code or math.
6. Blaze does not use an OpenAI or Google model.
7. The agent using the OpenAI model specializes in vision.

**Question:** What model does the agent specializing in **math** use?

**Answer format:** Exact model name as listed.
Example: GPT-4o`,
    input_data: `Agents: Apex, Blaze, Cipher, Drift
Models: GPT-4o (OpenAI), Claude-3.5 (Anthropic), Gemini-1.5 (Google), Llama-3.1 (Meta)
Specialties: code, math, vision, language

Clues:
1. Apex does not use a Google or Meta model.
2. The code specialist uses a Meta model.
3. Cipher's provider is not Anthropic or Google.
4. Gemini-1.5 agent specializes in language.
5. Drift does not specialize in code or math.
6. Blaze does not use OpenAI or Google.
7. The OpenAI model agent specializes in vision.`,
    answer: 'Claude-3.5',
  },

  // ══ 5 · Mar 2 · hard · Type D ──────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0005-4d5e-8f9a-000000000005',
    title: 'Broken Staircase',
    difficulty: 'hard',
    release_date: '2026-03-02',
    description: `This Python function counts distinct ways to climb **n** stairs (1 or 2 steps at a time). It has a bug: \`dp[0]\` is set to \`0\` instead of \`1\`.

\`\`\`python
def climb_stairs(n):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    dp = [0] * (n + 1)
    dp[0] = 0  # BUG — should be 1
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]
\`\`\`

The correct recurrence is: ways(n) = ways(n−1) + ways(n−2), with ways(0) = 1 and ways(1) = 1.

**Question:** What is the **correct** (bug-free) output for **n = 6**?

**Answer format:** Single integer.`,
    input_data: `Correct recurrence: ways(0)=1, ways(1)=1, ways(n)=ways(n-1)+ways(n-2)
Compute the correct value for n=6.`,
    answer: '13',
  },

  // ══ 6 · Mar 3 · easy · Type B ──────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0006-4d5e-8f9a-000000000006',
    title: 'Triple Threat',
    difficulty: 'easy',
    release_date: '2026-03-03',
    description: `A **Tribonacci** sequence: each term is the sum of the three preceding terms.

Starting values: **1, 2, 4** → a(n) = a(n−1) + a(n−2) + a(n−3)

You are given the first 7 terms:
\`1, 2, 4, 7, 13, 24, 44\`

**Your task:** Compute terms **a(8), a(9), a(10)**.

**Answer format:** Three comma-separated integers.
Example: 10,20,30`,
    input_data: '1,2,4,7,13,24,44',
    answer: '81,149,274',
  },

  // ══ 7 · Mar 4 · medium · Type A ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0007-4d5e-8f9a-000000000007',
    title: 'Checksum Chaos',
    difficulty: 'medium',
    release_date: '2026-03-04',
    description: `You have a CSV of API events. Each row has an \`event_id\`, a \`value\` field, and a \`checksum\`.

**Checksum rule:** \`checksum = (sum of individual digits of value) mod 100\`

Example: value = 48392 → digit sum = 4+8+3+9+2 = 26 → checksum = 26.

**Three** events have an incorrect checksum (stored value ≠ computed value).

**Your task:** Find the IDs of the three corrupted events.

**Answer format:** IDs sorted alphabetically, comma-separated.
Example: EVT-001,EVT-005,EVT-010`,
    input_data: `event_id,value,checksum
${eventData}`,
    answer: 'EVT-003,EVT-009,EVT-015',
  },

  // ══ 8 · Mar 5 · hard · Type C ──────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0008-4d5e-8f9a-000000000008',
    title: 'Vigenère Veil',
    difficulty: 'hard',
    release_date: '2026-03-05',
    description: `A message was encrypted using the **Vigenère cipher** with the key **"AGENT"**.

**Encryption:** each plaintext letter is shifted forward by the corresponding key-letter value (A=0, B=1, …, Z=25), cycling through the key.

**Decryption:** subtract the key value (mod 26).

**Ciphertext (uppercase, no spaces):**
\`ITZRLTOKNMEGPYLUYTRVTY\`

**Your task:** Decrypt the ciphertext. Return the plaintext (uppercase, no spaces).

**Answer format:** Uppercase letters only.
Example: HELLOWORLD`,
    input_data: `Key: AGENT (A=0, G=6, E=4, N=13, T=19, repeating)
Ciphertext: ITZRLTOKNMEGPYLUYTRVTY`,
    answer: 'INVESTIGATEALLSUSPECTS',
  },

  // ══ 9 · Mar 6 · medium · Type E ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0009-4d5e-8f9a-000000000009',
    title: 'Table for Four',
    difficulty: 'medium',
    release_date: '2026-03-06',
    description: `Four restaurants each have a unique chef, serve a unique dish, and charge a unique price.

**Restaurants:** Sakura, Bistro, Taverna, Spice Garden
**Chefs:** Akira, Pierre, Marco, Priya
**Dishes:** sushi, steak, pasta, curry
**Prices:** $18, $24, $32, $45

**Clues:**
1. Akira works at Sakura.
2. The steak dish costs more than $32.
3. Pierre works at Bistro.
4. The curry costs $24.
5. Marco's restaurant serves pasta.
6. The most expensive dish costs $45.
7. Sakura's dish costs more than $24.

**Question:** How much (in dollars, no $ sign) does the dish at Akira's restaurant cost?

**Answer format:** A number.
Example: 18`,
    input_data: `Restaurants: Sakura, Bistro, Taverna, Spice Garden
Chefs: Akira, Pierre, Marco, Priya
Dishes: sushi, steak, pasta, curry
Prices: 18, 24, 32, 45

Clues:
1. Akira works at Sakura.
2. Steak costs more than 32.
3. Pierre works at Bistro.
4. Curry costs 24.
5. Marco's restaurant serves pasta.
6. Most expensive dish costs 45.
7. Sakura's dish costs more than 24.`,
    answer: '32',
  },

  // ══ 10 · Mar 7 · easy · Type D ─────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0010-4d5e-8f9a-000000000010',
    title: 'Odd Behavior',
    difficulty: 'easy',
    release_date: '2026-03-07',
    description: `This Python function is supposed to count even numbers but has a bug:

\`\`\`python
def is_even(n):
    return n % 2 == 1  # BUG: should be == 0

def count_evens(numbers):
    return sum(1 for n in numbers if is_even(n))
\`\`\`

**Input:** \`[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]\`

The even numbers in this list are: 2, 4, 6, 8, 10.

**Question:** What is the **correct** count of even numbers?

**Answer format:** Single integer.`,
    input_data: '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]',
    answer: '5',
  },

  // ══ 11 · Mar 8 · medium · Type B ───────────────────────────────────────────
  {
    id: 'f1a2b3c4-0011-4d5e-8f9a-000000000011',
    title: 'Matrix Signature',
    difficulty: 'medium',
    release_date: '2026-03-08',
    description: `Compute the **determinant** of this 3×3 matrix using cofactor expansion along the first row.

\`\`\`
|  2   1   3 |
|  0   4   1 |
| -1   2   5 |
\`\`\`

Recall: det(A) = a₁₁(a₂₂a₃₃ − a₂₃a₃₂) − a₁₂(a₂₁a₃₃ − a₂₃a₃₁) + a₁₃(a₂₁a₃₂ − a₂₂a₃₁)

**Answer format:** Single integer (may be negative).
Example: -14`,
    input_data: `Matrix A:
[[ 2,  1,  3],
 [ 0,  4,  1],
 [-1,  2,  5]]`,
    answer: '47',
  },

  // ══ 12 · Mar 9 · hard · Type A ─────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0012-4d5e-8f9a-000000000012',
    title: 'Packet Tampering',
    difficulty: 'hard',
    release_date: '2026-03-09',
    description: `A network trace contains 30 packets. Each has a \`checksum\` field computed as:

\`checksum = (seq_num × 11 + size_bytes) mod 256\`

**Four** packets have been tampered with — their stored checksums don't match the formula.

**Your task:** Find the IDs of the 4 corrupted packets.

**Answer format:** IDs sorted alphabetically, comma-separated.
Example: PKT-001,PKT-005,PKT-012,PKT-020`,
    input_data: packetData,
    answer: 'PKT-006,PKT-013,PKT-021,PKT-027',
  },

  // ══ 13 · Mar 10 · easy · Type C ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0013-4d5e-8f9a-000000000013',
    title: 'ROT13 Riddle',
    difficulty: 'easy',
    release_date: '2026-03-10',
    description: `The following message was encoded with **ROT13** (each letter rotated 13 positions in the alphabet).

Decode it and return the **secret passcode word** (one word, uppercase).

**Ciphertext:**
\`Gur frperg cnffpbqr vf PBADHREBE\`

**Answer format:** One word, uppercase.
Example: DOLPHIN`,
    input_data: 'Gur frperg cnffpbqr vf PBADHREBE',
    answer: 'CONQUEROR',
  },

  // ══ 14 · Mar 11 · medium · Type E ──────────────────────────────────────────
  {
    id: 'f1a2b3c4-0014-4d5e-8f9a-000000000014',
    title: 'Breakthrough Timeline',
    difficulty: 'medium',
    release_date: '2026-03-11',
    description: `Five scientists each made a different breakthrough in a different year.

**Scientists:** Ava, Ben, Clara, Diego, Elena
**Discoveries:** fusion, quantum, AI, genome, dark-matter
**Years:** 2019, 2020, 2021, 2022, 2023

**Clues:**
1. Clara's discovery was made before 2020.
2. The AI breakthrough was made by a male scientist.
3. Ava's discovery is quantum-related.
4. Diego's discovery came after 2022.
5. The fusion discovery was the earliest of all five.
6. Elena's discovery was made in 2021.
7. Ben made his discovery after 2021.

**Question:** In what year was the **dark-matter** discovery made?

**Answer format:** Four-digit year.
Example: 2020`,
    input_data: `Scientists: Ava, Ben, Clara, Diego, Elena
Discoveries: fusion, quantum, AI, genome, dark-matter
Years: 2019, 2020, 2021, 2022, 2023

Clues:
1. Clara's discovery was made before 2020.
2. The AI breakthrough was made by a male scientist.
3. Ava's discovery is quantum-related.
4. Diego's discovery came after 2022.
5. The fusion discovery was the earliest.
6. Elena's discovery was made in 2021.
7. Ben made his discovery after 2021.`,
    answer: '2021',
  },

  // ══ 15 · Mar 12 · hard · Type D ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0015-4d5e-8f9a-000000000015',
    title: 'Hanoi Off-by-Two',
    difficulty: 'hard',
    release_date: '2026-03-12',
    description: `This Python function counts Tower of Hanoi moves but has a bug (\`n-2\` instead of \`n-1\`):

\`\`\`python
def hanoi_count(n):
    if n == 0:
        return 0
    if n == 1:
        return 1
    return 2 * hanoi_count(n - 2) + 1  # BUG: n-2 should be n-1
\`\`\`

The correct formula is: **hanoi(n) = 2ⁿ − 1**.

**Question:** What is the **correct** number of moves needed for **n = 7** disks?

**Answer format:** Single integer.`,
    input_data: `Correct formula: hanoi(n) = 2^n - 1
Compute for n = 7.`,
    answer: '127',
  },

  // ══ 16 · Mar 13 · easy · Type B ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0016-4d5e-8f9a-000000000016',
    title: 'Collatz Treasure Hunt',
    difficulty: 'easy',
    release_date: '2026-03-13',
    description: `The **Collatz sequence** from n follows:
- If n is even: n → n / 2
- If n is odd:  n → 3n + 1

Starting from **n = 27**, the sequence begins:
27, 82, 41, 124, 62, 31, 94, 47, …

**Question:** What is the **8th term** of the Collatz sequence starting at 27?

(27 is the 1st term.)

**Answer format:** Single integer.`,
    input_data: 'Starting value: 27\nRule: even → n/2 ; odd → 3n+1',
    answer: '47',
  },

  // ══ 17 · Mar 14 · medium · Type A ──────────────────────────────────────────
  {
    id: 'f1a2b3c4-0017-4d5e-8f9a-000000000017',
    title: 'Double Enrollment',
    difficulty: 'medium',
    release_date: '2026-03-14',
    description: `A university enrollment CSV contains student records. Due to a system error, some students were enrolled twice (their student ID appears more than once).

**Your task:** Find all student IDs that appear **more than once**.

**Answer format:** IDs sorted alphabetically, comma-separated.
Example: S001,S005`,
    input_data: `student_id,name,course,grade
S001,Alice Martin,CS101,A
S002,Bob Chen,MATH201,B
S003,Carol Davis,PHY301,A
S004,Daniel Lee,CS101,B
S005,Emma Wilson,MATH201,A
S006,Frank Brown,PHY301,C
S007,Grace Taylor,CS101,A
S008,Henry Moore,MATH201,B
S009,Isabella Clark,PHY301,A
S010,James Hall,CS101,B
S003,Carol Davis,CS101,A
S011,Karen Young,MATH201,B
S012,Leo King,PHY301,A
S013,Mia Wright,CS101,B
S014,Noah Scott,MATH201,A
S015,Olivia Torres,PHY301,B
S016,Peter Nguyen,CS101,A
S011,Karen Young,PHY301,C
S017,Quinn Adams,MATH201,B
S018,Rachel Baker,PHY301,A
S019,Sam Carter,CS101,B
S017,Quinn Adams,CS101,A
S020,Tina Evans,MATH201,A`,
    answer: 'S003,S011,S017',
  },

  // ══ 18 · Mar 15 · hard · Type E ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0018-4d5e-8f9a-000000000018',
    title: 'Agent Assignments',
    difficulty: 'hard',
    release_date: '2026-03-15',
    description: `Five AI agents each use a different model and specialize in a different task.

**Agents:** Aria, Bruno, Coral, Dex, Ember
**Models:** GPT-4o, Claude-3-Opus, Gemini-Ultra, Llama-3-70B, Mixtral-8x7B
**Tasks:** translation, summarization, code-review, analysis, creative-writing

**Clues:**
1. Aria does not use an open-source model (Llama and Mixtral are open-source).
2. The translation task is performed by the Gemini-Ultra agent.
3. Bruno specializes in code-review.
4. The Claude-3-Opus agent works on creative-writing.
5. Ember uses a model whose name contains "8x7B".
6. Aria uses a model made by OpenAI.
7. Dex does not work on summarization or creative-writing.
8. The Llama-3-70B agent does not do translation or creative-writing.
9. Aria works on data analysis.

**Question:** Which model does the **code-review** specialist use?

**Answer format:** Exact model name as listed.
Example: GPT-4o`,
    input_data: `Agents: Aria, Bruno, Coral, Dex, Ember
Models: GPT-4o, Claude-3-Opus, Gemini-Ultra, Llama-3-70B, Mixtral-8x7B
Tasks: translation, summarization, code-review, analysis, creative-writing

Clues:
1. Aria does not use an open-source model (Llama, Mixtral are open-source).
2. Translation is performed by the Gemini-Ultra agent.
3. Bruno specializes in code-review.
4. Claude-3-Opus agent works on creative-writing.
5. Ember uses a model whose name contains "8x7B".
6. Aria uses an OpenAI model.
7. Dex does not work on summarization or creative-writing.
8. Llama-3-70B agent does not do translation or creative-writing.
9. Aria works on data analysis.`,
    answer: 'Llama-3-70B',
  },

  // ══ 19 · Mar 16 · medium · Type C ──────────────────────────────────────────
  {
    id: 'f1a2b3c4-0019-4d5e-8f9a-000000000019',
    title: 'Double Agent',
    difficulty: 'medium',
    release_date: '2026-03-16',
    description: `A message was encoded in two steps:
1. **Caesar cipher, shift +3** applied to every letter (A→D, B→E, …, Z→C).
2. **Reverse** the entire resulting string.

To decode: reverse the steps in reverse order.

**Ciphertext:**
\`VLVBODQDDWDG\`

**Your task:** Decode and return the original plaintext (uppercase, no spaces).

**Answer format:** Uppercase letters only.
Example: HELLO`,
    input_data: `Encoding steps (applied in order):
1. Caesar shift +3: A→D, B→E, ..., Z→C
2. Reverse the string

Ciphertext: VLVBODQDDWDG`,
    answer: 'DATAANALYSIS',
  },

  // ══ 20 · Mar 17 · easy · Type D ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0020-4d5e-8f9a-000000000020',
    title: 'Last Seen',
    difficulty: 'easy',
    release_date: '2026-03-17',
    description: `This Python function removes duplicates but keeps the **last** occurrence instead of the first:

\`\`\`python
def remove_duplicates(lst):
    result = []
    for i in range(len(lst)):
        if lst[i] not in lst[i+1:]:
            result.append(lst[i])
    return result
\`\`\`

**Input:** \`[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]\`

**Question:** What should the **correct** output be — keeping the **first** occurrence of each value, in original order?

**Answer format:** Comma-separated integers.
Example: 1,2,3,4`,
    input_data: '[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]',
    answer: '3,1,4,5,9,2,6',
  },

  // ══ 21 · Mar 18 · medium · Type B ──────────────────────────────────────────
  {
    id: 'f1a2b3c4-0021-4d5e-8f9a-000000000021',
    title: "Pascal's Even Sum",
    difficulty: 'medium',
    release_date: '2026-03-18',
    description: `**Row 8** of Pascal's triangle contains the binomial coefficients:

C(8,0)=1, C(8,1)=8, C(8,2)=28, C(8,3)=56, C(8,4)=70, C(8,5)=56, C(8,6)=28, C(8,7)=8, C(8,8)=1

**Your task:** Compute the **sum of all even numbers** in row 8.

**Answer format:** Single integer.`,
    input_data: `Row 8 of Pascal's triangle:
1, 8, 28, 56, 70, 56, 28, 8, 1`,
    answer: '254',
  },

  // ══ 22 · Mar 19 · hard · Type A ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0022-4d5e-8f9a-000000000022',
    title: 'Over the Limit',
    difficulty: 'hard',
    release_date: '2026-03-19',
    description: `An expense system enforces per-transaction caps by category:

| Category      | Cap per transaction |
|---------------|-------------------|
| food          | $100              |
| travel        | $300              |
| tech          | $500              |
| entertainment | $75               |

**Your task:** Find all transaction IDs where the amount **strictly exceeds** (>) the category cap.

**Answer format:** IDs sorted alphabetically, comma-separated.
Example: TXN-001,TXN-007`,
    input_data: `transaction_id,category,amount,description
TXN-001,food,85,Team lunch
TXN-002,travel,250,Train tickets
TXN-003,tech,450,Software license
TXN-004,entertainment,60,Movie tickets
TXN-005,food,125,Client dinner
TXN-006,travel,180,Taxi fare
TXN-007,tech,380,Hardware component
TXN-008,food,95,Office snacks
TXN-009,entertainment,70,Game subscription
TXN-010,travel,290,Bus pass monthly
TXN-011,tech,500,Cloud credits
TXN-012,entertainment,90,Streaming bundle
TXN-013,food,78,Breakfast meeting
TXN-014,travel,320,Flight upgrade
TXN-015,tech,480,Developer tool
TXN-016,food,99,Team pizza
TXN-017,entertainment,65,Conference app
TXN-018,travel,350,Hotel one night
TXN-019,food,102,Team bbq
TXN-020,tech,510,New monitor
TXN-021,entertainment,72,Arcade outing
TXN-022,travel,275,Rideshare monthly
TXN-023,food,88,Catering supplies
TXN-024,tech,600,Laptop RAM upgrade
TXN-025,entertainment,55,Board game
TXN-026,travel,195,Bike rental
TXN-027,food,91,Department lunch
TXN-028,tech,490,API subscription
TXN-029,food,115,Farewell dinner
TXN-030,entertainment,74,Movie streaming`,
    // food>100: TXN-005(125), TXN-019(102), TXN-029(115)
    // travel>300: TXN-014(320), TXN-018(350)
    // tech>500: TXN-020(510), TXN-024(600)  [TXN-011=500 is NOT > 500]
    // ent>75: TXN-012(90)
    answer: 'TXN-005,TXN-012,TXN-014,TXN-018,TXN-019,TXN-020,TXN-024,TXN-029',
  },

  // ══ 23 · Mar 20 · medium · Type E ──────────────────────────────────────────
  {
    id: 'f1a2b3c4-0023-4d5e-8f9a-000000000023',
    title: 'Language Lab',
    difficulty: 'medium',
    release_date: '2026-03-20',
    description: `Five fictional programming languages were each created by a different developer in a different year.

**Languages:** Alpha, Beta, Gamma, Delta, Epsilon
**Creators:** Alex, Blake, Casey, Drew, Emery
**Paradigms:** functional, object-oriented, systems, scripting, concurrent
**Years:** 2016, 2018, 2019, 2020, 2022

**Clues:**
1. Alex created a functional programming language.
2. The systems language was created in 2020.
3. Blake's language focuses on concurrent programming.
4. The scripting language was created before 2019.
5. Gamma was created earlier than Epsilon.
6. Casey did not create the concurrent or functional language.
7. Drew created the language released in 2019.
8. The oldest language among the five is Gamma.
9. Casey's language was first released in 2020.

**Question:** Who created the **scripting** language?

**Answer format:** Single first name.
Example: Blake`,
    input_data: `Languages: Alpha, Beta, Gamma, Delta, Epsilon
Creators: Alex, Blake, Casey, Drew, Emery
Paradigms: functional, object-oriented, systems, scripting, concurrent
Years: 2016, 2018, 2019, 2020, 2022

Clues:
1. Alex created a functional programming language.
2. The systems language was created in 2020.
3. Blake's language focuses on concurrent programming.
4. The scripting language was created before 2019 (so in 2016).
5. Gamma was created earlier than Epsilon.
6. Casey did not create the concurrent or functional language.
7. Drew created the language released in 2019.
8. The oldest language (2016) is Gamma.
9. Casey's language was first released in 2020.`,
    answer: 'Emery',
  },

  // ══ 24 · Mar 21 · hard · Type C ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0024-4d5e-8f9a-000000000024',
    title: 'Every Twenty-Fifth',
    difficulty: 'hard',
    release_date: '2026-03-21',
    description: `A secret message is hidden inside a block of text using **position-based steganography**.

**Method:** Count only the **alphabetic characters** (A–Z), ignoring spaces and all punctuation. Every **25th alphabetic character** (positions 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300) is part of the hidden message.

The block contains exactly **300 alphabetic characters**, producing a **12-character** hidden message.

**Your task:** Extract the hidden message (uppercase).

**Answer format:** 12 uppercase letters, no spaces.`,
    input_data: stegoText,
    answer: 'CRACKTHECODE',
  },

  // ══ 25 · Mar 22 · easy · Type D ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0025-4d5e-8f9a-000000000025',
    title: 'Sort Sabotage',
    difficulty: 'easy',
    release_date: '2026-03-22',
    description: `This Python insertion sort has a bug: it sorts in **descending** order because \`<\` should be \`>\`.

\`\`\`python
def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] < key:  # BUG: < should be >
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr
\`\`\`

**Input:** \`[5, 2, 8, 1, 9, 3]\`

**Question:** What does the **correct** ascending sort produce?

**Answer format:** Comma-separated integers.`,
    input_data: '[5, 2, 8, 1, 9, 3]',
    answer: '1,2,3,5,8,9',
  },

  // ══ 26 · Mar 23 · hard · Type B ────────────────────────────────────────────
  {
    id: 'f1a2b3c4-0026-4d5e-8f9a-000000000026',
    title: 'Prime Constellation',
    difficulty: 'hard',
    release_date: '2026-03-23',
    description: `A sequence uses the first 20 prime numbers (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71):

- If **n is odd**: a(n) = the n-th prime
- If **n is even**: a(n) = ((n−1)-th prime × n-th prime) **mod 1000**

So: a(1)=2, a(2)=(2×3)%1000=6, a(3)=5, a(4)=(5×7)%1000=35, a(5)=11, a(6)=(11×13)%1000=143, …

**Your task:** Compute the **sum of a(1) through a(20)**.

**Answer format:** Single integer.`,
    input_data: `First 20 primes: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71

Rule:
- a(n) = n-th prime,                          if n is ODD
- a(n) = ((n-1)-th prime × n-th prime) % 1000, if n is EVEN

Compute sum of a(1) through a(20).`,
    answer: p26Answer, // 4234
  },

  // ══ 27 · Mar 24 · medium · Type A ──────────────────────────────────────────
  {
    id: 'f1a2b3c4-0027-4d5e-8f9a-000000000027',
    title: 'Metric Mismatch',
    difficulty: 'medium',
    release_date: '2026-03-24',
    description: `You have JSON server health metrics. Each record has \`cpu_pct\` (0–100), \`mem_pct\` (0–100), and a \`status\` field.

**Status rules:**
- \`"critical"\` if cpu_pct > 90 **OR** mem_pct > 90
- \`"warning"\`  if cpu_pct > 70 **OR** mem_pct > 70  (and not critical)
- \`"healthy"\`  otherwise

**Your task:** Find all server IDs where the stored \`status\` is **incorrect**.

**Answer format:** IDs sorted alphabetically, comma-separated.
Example: SRV-002,SRV-007`,
    input_data: `[
  {"server_id":"SRV-001","cpu_pct":45,"mem_pct":62,"status":"healthy"},
  {"server_id":"SRV-002","cpu_pct":82,"mem_pct":55,"status":"healthy"},
  {"server_id":"SRV-003","cpu_pct":91,"mem_pct":40,"status":"critical"},
  {"server_id":"SRV-004","cpu_pct":30,"mem_pct":88,"status":"warning"},
  {"server_id":"SRV-005","cpu_pct":67,"mem_pct":71,"status":"warning"},
  {"server_id":"SRV-006","cpu_pct":95,"mem_pct":92,"status":"critical"},
  {"server_id":"SRV-007","cpu_pct":50,"mem_pct":50,"status":"warning"},
  {"server_id":"SRV-008","cpu_pct":78,"mem_pct":65,"status":"warning"},
  {"server_id":"SRV-009","cpu_pct":22,"mem_pct":91,"status":"healthy"},
  {"server_id":"SRV-010","cpu_pct":88,"mem_pct":89,"status":"critical"},
  {"server_id":"SRV-011","cpu_pct":35,"mem_pct":40,"status":"healthy"},
  {"server_id":"SRV-012","cpu_pct":74,"mem_pct":30,"status":"healthy"},
  {"server_id":"SRV-013","cpu_pct":60,"mem_pct":75,"status":"warning"},
  {"server_id":"SRV-014","cpu_pct":93,"mem_pct":50,"status":"warning"},
  {"server_id":"SRV-015","cpu_pct":10,"mem_pct":20,"status":"healthy"}
]`,
    // SRV-002: cpu=82>70 → warning, stored healthy ❌
    // SRV-007: cpu=50,mem=50 → healthy, stored warning ❌
    // SRV-009: mem=91>90 → critical, stored healthy ❌
    // SRV-010: cpu=88,mem=89, neither>90 → warning, stored critical ❌
    // SRV-012: cpu=74>70 → warning, stored healthy ❌
    // SRV-014: cpu=93>90 → critical, stored warning ❌
    answer: 'SRV-002,SRV-007,SRV-009,SRV-010,SRV-012,SRV-014',
  },

  // ══ 28 · Mar 25 · medium · Type E ──────────────────────────────────────────
  {
    id: 'f1a2b3c4-0028-4d5e-8f9a-000000000028',
    title: 'Five-Star Lineup',
    difficulty: 'medium',
    release_date: '2026-03-25',
    description: `Five AI assistants competed in a benchmark. Each scored a unique score from {72, 78, 85, 91, 96}.

**Assistants:** Aether, Bolt, Crest, Dusk, Echo
**Scores:** 72, 78, 85, 91, 96
**Providers:** OpenAI, Anthropic, Google, Meta, Mistral AI

**Clues:**
1. Aether's score is exactly **13 more** than Bolt's score.
2. The Anthropic assistant scored **96**.
3. Crest uses a Google model.
4. Echo scored the **lowest** of all five.
5. The Meta assistant scored **78**.
6. Bolt does not use OpenAI or Anthropic.

**Question:** What score did **Aether** achieve?

**Answer format:** Single integer.`,
    input_data: `Assistants: Aether, Bolt, Crest, Dusk, Echo
Scores: 72, 78, 85, 91, 96
Providers: OpenAI, Anthropic, Google, Meta, Mistral AI

Clues:
1. Aether's score = Bolt's score + 13.
2. The Anthropic assistant scored 96.
3. Crest uses a Google model.
4. Echo scored the lowest (72).
5. The Meta assistant scored 78.
6. Bolt does not use OpenAI or Anthropic.`,
    // Bolt+13=Aether, from {72,78,85,91,96}: Bolt=78, Aether=91
    // Echo=72 (lowest). Remaining 85,96 for Crest,Dusk.
    // Anthropic=96: Crest=Google≠Anthropic → Dusk=96(Anthropic), Crest=85(Google).
    // Meta=78=Bolt. Bolt not OpenAI/Anthropic → Bolt=Meta ✓.
    answer: '91',
  },

  // ══ 29 · Mar 26 · insane · Type C ──────────────────────────────────────────
  {
    id: 'f1a2b3c4-0029-4d5e-8f9a-000000000029',
    title: 'Triple Encryption',
    difficulty: 'insane',
    release_date: '2026-03-26',
    description: `A message was encrypted through **three successive steps** in this exact order:

**Step 1 — Atbash cipher:** Replace each letter with its mirror (A↔Z, B↔Y, …, M↔N). Non-letters unchanged.

**Step 2 — Caesar shift +7:** Shift each letter 7 positions forward (A→H, …, S→Z, T→A, U→B, V→C, W→D, X→E, Y→F, Z→G). Non-letters unchanged.

**Step 3 — Reverse:** Reverse the entire string character by character.

**To decrypt:** apply the three steps in **reverse order** (un-reverse, then Caesar −7, then Atbash).

**Ciphertext:**
\`CPCZKIPCLCCPGONTCAG\`

**Your task:** Decrypt and return the plaintext (uppercase, no spaces).

**Answer format:** Uppercase letters, no spaces.`,
    input_data: `Encryption order:
1. Atbash: A↔Z, B↔Y, C↔X, D↔W, E↔V, F↔U, G↔T, H↔S, I↔R, J↔Q, K↔P, L↔O, M↔N (and vice versa)
2. Caesar +7: A→H, B→I, ..., Z→G
3. Reverse the entire string

Decryption order (reverse the steps):
1. Reverse the ciphertext
2. Caesar −7
3. Atbash

Ciphertext: CPCZKIPCLCCPGONTCAG`,
    answer: 'AGENTSAREEVERYWHERE',
  },

  // ══ 30 · Mar 27 · insane · Type A+B ────────────────────────────────────────
  {
    id: 'f1a2b3c4-0030-4d5e-8f9a-000000000030',
    title: 'The Final Reckoning',
    difficulty: 'insane',
    release_date: '2026-03-27',
    description: `This challenge has **two parts**. Your final answer is **Part A + Part B**.

---

**Part A — Find the Missing Number**

You are given a shuffled list of 49 integers. It contains every integer from 1 to 50 exactly once, **except one** which is missing. Find the missing number.

*Hint: The sum of 1 to 50 is 1,275. Subtract the sum of the list.*

---

**Part B — Sum of Primes ≤ 50**

Compute the sum of all prime numbers less than or equal to 50.

Primes ≤ 50: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47

---

**Final Answer:** Part A result **+** Part B result.

**Answer format:** Single integer.`,
    input_data: `Part A — Shuffled list (49 integers from 1 to 50, one is missing):
${final30.data}

Part B — Find the sum of all primes ≤ 50.
Primes ≤ 50: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47`,
    answer: final30.answer, // 37 + 328 = 365
  },
];

// ─── Dry-run or seed ──────────────────────────────────────────────────────────
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log(`\n📋  Dry run — ${puzzles.length} puzzles:\n`);
  for (const p of puzzles) {
    console.log(`  [${p.release_date}] ${p.difficulty.padEnd(8)} ${p.title}`);
    console.log(`           answer: ${p.answer}`);
  }
  console.log(`\nTotal: ${puzzles.length} puzzles`);
  console.log(`Difficulty: easy=${puzzles.filter(p=>p.difficulty==='easy').length}, medium=${puzzles.filter(p=>p.difficulty==='medium').length}, hard=${puzzles.filter(p=>p.difficulty==='hard').length}, insane=${puzzles.filter(p=>p.difficulty==='insane').length}`);
} else {
  console.log(`\n🌱  Seeding ${puzzles.length} puzzles to Supabase...\n`);
  let ok = 0, fail = 0;
  for (const puzzle of puzzles) {
    const success = await seedPuzzle(puzzle);
    if (success) ok++; else fail++;
  }
  console.log(`\n✨  Done — ${ok} seeded, ${fail} failed`);

  if (ok > 0) {
    // Quick verification: fetch 5 puzzles back
    console.log('\n🔍  Verifying 5 seeded puzzles...');
    const ids = puzzles.slice(0, 5).map(p => p.id);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/puzzles?id=in.(${ids.join(',')})&select=id,title,release_date,difficulty`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      for (const row of rows) {
        console.log(`  ✅  ${row.release_date} — ${row.title} (${row.difficulty})`);
      }
    } else {
      console.error('  ⚠️   Could not verify:', await res.text());
    }
  }
}
