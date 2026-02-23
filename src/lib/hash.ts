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
  // Use dynamic key to prevent Vite from statically replacing process.env.* at build time.
  // import.meta.env is build-time only for private vars; process.env[key] is runtime-safe.
  const saltKey = 'ANSWER_SALT';
  const salt =
    (typeof process !== 'undefined' ? process.env[saltKey] : undefined) ||
    (typeof import.meta !== 'undefined' ? import.meta.env?.ANSWER_SALT : undefined);

  if (!salt) {
    if (import.meta.env.PROD) {
      throw new Error('ANSWER_SALT environment variable is required in production');
    }
    // dev fallback only
    console.warn('⚠️  ANSWER_SALT not set — using dev fallback. Do not use in production!');
  }

  const ANSWER_SALT = salt || 'dev-salt-not-for-production';
  return sha256(`${answer}:${puzzleId}:${ANSWER_SALT}`);
}

/**
 * Hash an answer with an explicit salt — useful for testing and scripting.
 * Format: SHA-256(answer:puzzleId:salt)
 */
export async function hashAnswer(answer: string, puzzleId: string, salt: string): Promise<string> {
  return sha256(`${answer}:${puzzleId}:${salt}`);
}
