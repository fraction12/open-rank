import { supabaseAdmin } from './supabase';

/**
 * Persistent rate limiter backed by Supabase.
 * Uses supabaseAdmin (service role) — rate_limits RLS is locked to service role only.
 * Falls back to in-memory if Supabase is unavailable.
 */
const fallback = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (!supabaseAdmin) {
    console.warn('[rate-limit] DB-backed rate limiter unavailable, falling back to in-memory (per-instance, resets on cold start)');
    return checkFallback(key, maxRequests, windowMs);
  }

  // Opportunistic cleanup — fire and forget, don't await
  supabaseAdmin.rpc('cleanup_rate_limits').then(() => {}).catch(() => {});

  try {
    // Upsert: if key exists and not expired, increment; else reset
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_max: maxRequests,
      p_window_ms: windowMs,
    });

    if (error) {
      console.warn('Rate limit DB error, using fallback:', error.message);
      return checkFallback(key, maxRequests, windowMs);
    }

    // data = { allowed: boolean, count: number, reset_at: string }
    if (!data.allowed) {
      const retryAfter = Math.ceil((new Date(data.reset_at).getTime() - Date.now()) / 1000);
      return { allowed: false, retryAfter: Math.max(1, retryAfter) };
    }
    return { allowed: true };
  } catch {
    console.warn('[rate-limit] DB-backed rate limiter unavailable, falling back to in-memory (per-instance, resets on cold start)');
    return checkFallback(key, maxRequests, windowMs);
  }
}

function checkFallback(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const entry = fallback.get(key);
  if (!entry || now > entry.resetAt) {
    fallback.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}
