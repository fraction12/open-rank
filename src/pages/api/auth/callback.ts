import type { APIRoute } from 'astro';
import { createServerClient } from '@supabase/ssr';
import { AUTH_COOKIE_NAME } from '../../../lib/supabase';
import { getEnv, missingRequiredEnv } from '../../../lib/env';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  if (!code) return redirect('/');

  const missing = missingRequiredEnv();
  if (missing.length > 0) return redirect('/?auth=misconfigured');

  const supabaseUrl = getEnv('SUPABASE_URL') as string;
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') as string;

  const secureCookies = new URL(request.url).protocol === 'https:';

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => {
        const cookieNames = [
          AUTH_COOKIE_NAME,
          `${AUTH_COOKIE_NAME}.0`,
          `${AUTH_COOKIE_NAME}.1`,
          `${AUTH_COOKIE_NAME}-code-verifier`,
        ];
        return cookieNames
          .map(name => ({ name, value: cookies.get(name)?.value ?? '' }))
          .filter(c => c.value !== '');
      },
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

  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error || !data.user) return redirect('/?auth=error');

  // Upsert user in our users table — use the authenticated client so RLS INSERT policy passes
  const providerId = data.user.user_metadata?.provider_id ?? data.user.user_metadata?.sub;
  const githubId = parseInt(String(providerId));
  const githubLogin = data.user.user_metadata?.user_name ?? data.user.user_metadata?.preferred_username;
  const avatarUrl = data.user.user_metadata?.avatar_url;

  if (!isNaN(githubId) && githubLogin) {
    const { error: upsertError } = await client.from('users').upsert({
      github_id: githubId,
      github_login: githubLogin,
      avatar_url: avatarUrl ?? null,
    }, { onConflict: 'github_id' });
    if (upsertError) {
      console.error('[auth/callback] users upsert failed:', upsertError.message);
    }
  }

  return redirect('/dashboard');
};
