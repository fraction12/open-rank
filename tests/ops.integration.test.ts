import { afterEach, describe, expect, it, vi } from 'vitest';

function clearSupabaseEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
}

describe('Operational endpoints and auth resilience', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clearSupabaseEnv();
  });

  it('GET /api/health returns liveness payload', async () => {
    const { GET } = await import('../src/pages/api/health.ts');
    const response = await GET({
      locals: { requestId: 'req-123' },
    } as never);

    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.request_id).toBe('req-123');
  });

  it('GET /api/ready returns 503 when required env vars are missing', async () => {
    clearSupabaseEnv();
    const { GET } = await import('../src/pages/api/ready.ts');
    const response = await GET({
      locals: { requestId: 'req-456' },
    } as never);

    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(503);
    expect(body.status).toBe('not_ready');
    expect(body.reason).toBe('env_missing');
  });

  it('GET /api/ready returns ready when db check passes', async () => {
    process.env.SUPABASE_URL = 'https://demo.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    vi.doMock('../src/lib/supabase', () => ({
      supabaseAdmin: {
        from() {
          return {
            select() {
              return {
                limit: async () => ({ error: null }),
              };
            },
          };
        },
      },
    }));

    const { GET } = await import('../src/pages/api/ready.ts');
    const response = await GET({
      locals: { requestId: 'req-789' },
    } as never);

    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.status).toBe('ready');
  });

  it('GET /api/auth/signin fails gracefully when auth env is missing', async () => {
    clearSupabaseEnv();
    vi.doMock('../src/lib/rate-limit', () => ({
      checkRateLimit: vi.fn(async () => ({ allowed: true })),
    }));

    const { GET } = await import('../src/pages/api/auth/signin.ts');
    const response = await GET({
      request: new Request('http://localhost/api/auth/signin'),
      cookies: { set: vi.fn() },
      redirect: vi.fn((path: string) => new Response(path, { status: 302 })),
    } as never);

    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(503);
    expect(body.code).toBe('AUTH_NOT_CONFIGURED');
  });
});
