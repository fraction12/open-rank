import type { APIRoute } from 'astro';
import { createServerClient } from '@supabase/ssr';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const supabaseUrl = (typeof process !== 'undefined' ? process.env['SUPABASE_URL'] : undefined) || import.meta.env.SUPABASE_URL as string;
  const supabaseAnonKey = (typeof process !== 'undefined' ? process.env['SUPABASE_ANON_KEY'] : undefined) || import.meta.env.SUPABASE_ANON_KEY as string;

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => [],
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

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: 'https://open-rank.com/api/auth/callback',
      scopes: 'read:user',
    },
  });

  if (error || !data.url) return redirect('/?auth=error');
  return redirect(data.url);
};
