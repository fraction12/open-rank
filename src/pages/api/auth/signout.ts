import type { APIRoute } from 'astro';
import { createServerClient } from '@supabase/ssr';
import { AUTH_COOKIE_NAME } from '../../../lib/supabase';
import { corsHeaders } from '../../../lib/cors';
import { jsonError } from '../../../lib/response';
import { verifyCsrfHeaderOrForm } from '../../../lib/csrf';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const cors = corsHeaders(request);
  if (!(await verifyCsrfHeaderOrForm(request, cookies))) {
    return jsonError('Invalid CSRF token', 403, 'CSRF_INVALID', cors);
  }

  const supabaseUrl = (typeof process !== 'undefined' ? process.env['SUPABASE_URL'] : undefined) || import.meta.env.SUPABASE_URL as string;
  const supabaseAnonKey = (typeof process !== 'undefined' ? process.env['SUPABASE_ANON_KEY'] : undefined) || import.meta.env.SUPABASE_ANON_KEY as string;

  const cookieNames = [
    AUTH_COOKIE_NAME,
    `${AUTH_COOKIE_NAME}.0`,
    `${AUTH_COOKIE_NAME}.1`,
    `${AUTH_COOKIE_NAME}-code-verifier`,
  ];

  const secureCookies = new URL(request.url).protocol === 'https:';

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () =>
        cookieNames
          .map(name => ({ name, value: cookies.get(name)?.value ?? '' }))
          .filter(c => c.value !== ''),
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

  await client.auth.signOut();

  // Clear cookies manually
  for (const name of cookieNames) {
    cookies.delete(name, { path: '/' });
  }

  return redirect('/');
};
