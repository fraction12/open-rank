import type { APIRoute } from 'astro';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '../../../lib/rate-limit';
import { jsonError } from '../../../lib/response';
import { getEnv, missingRequiredEnv } from '../../../lib/env';

export const GET: APIRoute = async ({ cookies, redirect, request }) => {
  // Rate limit: 10 sign-in attempts per IP per minute
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';
  const rl = await checkRateLimit(`signin:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return jsonError('Too many requests', 429, 'RATE_LIMITED');
  }
  const missing = missingRequiredEnv();
  if (missing.length > 0) {
    return jsonError('Auth provider is not configured', 503, 'AUTH_NOT_CONFIGURED');
  }

  const supabaseUrl = getEnv('SUPABASE_URL') as string;
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') as string;

  // Vercel serverless: request.url may resolve to an internal address (localhost).
  // Log all relevant headers to diagnose origin resolution.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const rawUrl = request.url;
  console.log(JSON.stringify({ forwardedHost, forwardedProto, rawUrl }));
  const requestOrigin = forwardedHost
    ? `${forwardedProto.split(',')[0].trim()}://${forwardedHost}`
    : new URL(request.url).origin;
  const secureCookies = requestOrigin.startsWith('https://');

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => [],
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, {
            path: '/',
            httpOnly: true,
            secure: secureCookies,
            sameSite: 'lax',
            maxAge: options?.maxAge,
          });
        }
      },
    },
  });

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${requestOrigin}/api/auth/callback`,
      scopes: 'read:user',
    },
  });

  if (error || !data.url) return redirect('/?auth=error');
  return redirect(data.url);
};
