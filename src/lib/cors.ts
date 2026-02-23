// Allowlisted origins
const ALLOWED_ORIGINS = new Set([
  'https://open-rank.com',
  'https://www.open-rank.com',
  'http://localhost:4321',
  'http://localhost:3000',
]);

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const isAllowedOrigin = origin !== '' && ALLOWED_ORIGINS.has(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-CSRF-Token, X-Request-Id',
    'Access-Control-Expose-Headers': 'X-Request-Id',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  if (isAllowedOrigin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function handleOptions(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
