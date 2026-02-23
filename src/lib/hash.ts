/**
 * SHA-256 hash helper using the Web Crypto API (works in Node 18+ and Edge runtimes)
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns the first N characters of a SHA-256 hash
 */
export async function sha256Short(text: string, length = 6): Promise<string> {
  const full = await sha256(text);
  return full.slice(0, length);
}

/**
 * Salted hash for answer verification.
 * Format: SHA-256(answer:puzzleId:ANSWER_SALT)
 * The salt prevents rainbow-table attacks on answer hashes stored in the DB.
 */
export async function saltedHash(answer: string, puzzleId: string): Promise<string> {
  // import.meta.env works at build time; process.env works in Vercel serverless/edge runtime
  const salt =
    import.meta.env.ANSWER_SALT ||
    (typeof process !== 'undefined' ? process.env.ANSWER_SALT : undefined) ||
    'dev-salt-not-for-production';
  return sha256(`${answer}:${puzzleId}:${salt}`);
}
