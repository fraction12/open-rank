// TEMPORARY diagnostic endpoint — remove after debugging
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const key = 'ANSWER_SALT';
  const hasSalt = !!(typeof process !== 'undefined' && process.env[key]);
  const saltSource = typeof process !== 'undefined' && process.env[key]
    ? 'process.env'
    : import.meta.env.ANSWER_SALT
    ? 'import.meta.env'
    : 'fallback';

  // Test hash with each possible salt
  const answer = '1042,5891,7234';
  const puzzleId = 'a1000000-0001-0001-0001-000000000001';

  const saltValue = (typeof process !== 'undefined' ? process.env[key] : undefined)
    || import.meta.env.ANSWER_SALT
    || 'dev-salt-not-for-production';

  const encoder = new TextEncoder();
  const data = encoder.encode(`${answer}:${puzzleId}:${saltValue}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return new Response(JSON.stringify({
    hasSalt,
    saltSource,
    saltLength: saltValue.length,
    saltPrefix: saltValue.slice(0, 8) + '...',
    computedHash: hash,
    expectedHash: '4d93a8d9271bcd298f5691f834039a355b554fc2e72c2f49128f8e7fc5bb0389',
    match: hash === '4d93a8d9271bcd298f5691f834039a355b554fc2e72c2f49128f8e7fc5bb0389',
    SUPABASE_URL_set: !!(typeof process !== 'undefined' && process.env['SUPABASE_URL']),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
