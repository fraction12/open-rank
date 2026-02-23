import type { APIRoute } from 'astro';
import { createServerClient } from '@supabase/ssr';
import { AUTH_COOKIE_NAME } from '../../../lib/supabase';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabaseUrl = (typeof process !== 'undefined' ? process.env['SUPABASE_URL'] : undefined) || import.meta.env.SUPABASE_URL as string;
  const supabaseAnonKey = (typeof process !== 'undefined' ? process.env['SUPABASE_ANON_KEY'] : undefined) || import.meta.env.SUPABASE_ANON_KEY as string;

  const cookieNames = [
    AUTH_COOKIE_NAME,
    `${AUTH_COOKIE_NAME}.0`,
    `${AUTH_COOKIE_NAME}.1`,
    `${AUTH_COOKIE_NAME}-code-verifier`,
  ];

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
            secure: true,
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
