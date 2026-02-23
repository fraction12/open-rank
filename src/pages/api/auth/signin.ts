import type { APIRoute } from 'astro';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '../../../lib/rate-limit';
import { jsonError } from '../../../lib/response';

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
  const supabaseUrl = (typeof process !== 'undefined' ? process.env['SUPABASE_URL'] : undefined) || import.meta.env.SUPABASE_URL as string;
  const supabaseAnonKey = (typeof process !== 'undefined' ? process.env['SUPABASE_ANON_KEY'] : undefined) || import.meta.env.SUPABASE_ANON_KEY as string;

  const requestOrigin = new URL(request.url).origin;
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
