import type { AstroCookies } from 'astro';

export const CSRF_COOKIE_NAME = 'openrank_csrf';

function isHttps(url: URL) {
  return url.protocol === 'https:';
}

export function ensureCsrfCookie(cookies: AstroCookies, url: URL): string {
  const existing = cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = crypto.randomUUID().replace(/-/g, '');
  cookies.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    sameSite: 'lax',
    secure: isHttps(url),
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export function verifyCsrfHeader(request: Request, cookies: AstroCookies): boolean {
  const cookieToken = cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;

  const headerToken = request.headers.get('x-csrf-token');
  return typeof headerToken === 'string' && headerToken.length > 0 && headerToken === cookieToken;
}

export async function verifyCsrfHeaderOrForm(request: Request, cookies: AstroCookies): Promise<boolean> {
  if (verifyCsrfHeader(request, cookies)) return true;

  const cookieToken = cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
    return false;
  }

  try {
    const form = await request.formData();
    const formToken = form.get('csrf_token');
    return typeof formToken === 'string' && formToken === cookieToken;
  } catch {
    return false;
  }
}
