import { defineMiddleware } from 'astro/middleware';

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

function buildSecurityHeaders(url: URL): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  if (url.protocol === 'https:') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const requestId = context.request.headers.get('x-request-id') || crypto.randomUUID();
  const clientIp = getClientIp(context.request);
  const started = Date.now();

  context.locals.requestId = requestId;
  context.locals.clientIp = clientIp;

  let response: Response;
  try {
    response = await next();
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'unhandled_request_error',
      timestamp: new Date().toISOString(),
      context: {
        request_id: requestId,
        method: context.request.method,
        path: context.url.pathname,
        ip: clientIp,
        error: error instanceof Error ? error.message : String(error),
      },
    }));

    response = new Response('Internal Server Error', { status: 500 });
  }

  response.headers.set('X-Request-Id', requestId);

  const securityHeaders = buildSecurityHeaders(context.url);
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  if (context.url.pathname.startsWith('/api/')) {
    const durationMs = Date.now() - started;
    console.log(JSON.stringify({
      level: 'info',
      message: 'api_request',
      timestamp: new Date().toISOString(),
      context: {
        request_id: requestId,
        method: context.request.method,
        path: context.url.pathname,
        status: response.status,
        duration_ms: durationMs,
        ip: clientIp,
      },
    }));
  }

  return response;
});
