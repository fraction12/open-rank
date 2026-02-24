import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
  count?: number | null;
};

type QueryInput = {
  table: string;
  op: 'select' | 'insert' | 'update';
  terminal: 'single' | 'maybeSingle' | 'many' | 'head';
  columns?: string;
  filters: Array<{ kind: string; column?: string; value?: unknown }>;
  values?: Record<string, unknown>;
};

class QueryBuilder {
  private readonly query: QueryInput;
  private readonly dispatch: (query: QueryInput) => QueryResult;
  private selectHead = false;
  private terminal: QueryInput['terminal'] | null = null;

  constructor(
    table: string,
    dispatch: (query: QueryInput) => QueryResult,
    op: QueryInput['op'] = 'select',
  ) {
    this.dispatch = dispatch;
    this.query = { table, op, terminal: 'many', filters: [] };
  }

  select(columns?: string, options?: { head?: boolean }) {
    this.query.columns = columns;
    if (this.query.op === 'select') {
      this.query.op = 'select';
    }
    this.selectHead = Boolean(options?.head);
    return this;
  }

  insert(values: Record<string, unknown>) {
    this.query.op = 'insert';
    this.query.values = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.query.op = 'update';
    this.query.values = values;
    return this;
  }

  eq(column: string, value: unknown) {
    this.query.filters.push({ kind: 'eq', column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.query.filters.push({ kind: 'lte', column, value });
    return this;
  }

  is(column: string, value: unknown) {
    this.query.filters.push({ kind: 'is', column, value });
    return this;
  }

  not(column: string, _op: string, value: unknown) {
    this.query.filters.push({ kind: 'not', column, value });
    return this;
  }

  or(expr: string) {
    this.query.filters.push({ kind: 'or', value: expr });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.query.filters.push({ kind: 'order', column, value: opts?.ascending ?? true });
    return this;
  }

  limit(value: number) {
    this.query.filters.push({ kind: 'limit', value });
    return this;
  }

  single() {
    this.terminal = 'single';
    return this.execute();
  }

  maybeSingle() {
    this.terminal = 'maybeSingle';
    return this.execute();
  }

  then(onfulfilled?: (value: QueryResult) => unknown, onrejected?: (reason: unknown) => unknown) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private execute() {
    const terminal = this.terminal ?? (this.selectHead ? 'head' : 'many');
    this.query.terminal = terminal;
    return Promise.resolve(this.dispatch(this.query));
  }
}

function createSupabaseAdminMock(dispatch: (query: QueryInput) => QueryResult) {
  return {
    from(table: string) {
      return new QueryBuilder(table, dispatch);
    },
  };
}

const state = {
  supabaseAdmin: null as ReturnType<typeof createSupabaseAdminMock> | null,
  supabase: null as { rpc: ReturnType<typeof vi.fn> } | null,
  getCurrentUser: vi.fn(),
  getAgentByKey: vi.fn(),
};

const mockCheckRateLimit = vi.fn(async () => ({ allowed: true }));
const mockSaltedHash = vi.fn(async () => 'hash-match');

vi.mock('../src/lib/supabase', () => ({
  get supabase() {
    return state.supabase;
  },
  get supabaseAdmin() {
    return state.supabaseAdmin;
  },
  getCurrentUser: state.getCurrentUser,
  getAgentByKey: state.getAgentByKey,
}));

vi.mock('../src/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock('../src/lib/hash', () => ({
  saltedHash: mockSaltedHash,
}));

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function cookieStore(token?: string) {
  return {
    get(name: string) {
      if (name !== 'openrank_csrf' || !token) return undefined;
      return { value: token };
    },
  };
}

const validPuzzleId = '11111111-1111-4111-8111-111111111111';
const validSessionId = '22222222-2222-4222-8222-222222222222';
const validApiKey = '33333333-3333-4333-8333-333333333333';

describe('API integration: release gating and duplicate handling', () => {
  beforeEach(() => {
    state.supabaseAdmin = null;
    state.supabase = null;
    state.getCurrentUser.mockReset();
    state.getAgentByKey.mockReset();
    mockCheckRateLimit.mockClear();
    mockSaltedHash.mockClear();
  });

  it('GET /api/puzzle/:id rejects unreleased puzzles', async () => {
    const queries: QueryInput[] = [];
    state.supabaseAdmin = createSupabaseAdminMock((query) => {
      queries.push({ ...query, filters: [...query.filters] });
      if (query.table === 'puzzles' && query.terminal === 'single') {
        return { data: null, error: { message: 'not found' } };
      }
      return { data: null, error: null };
    });

    const { GET } = await import('../src/pages/api/puzzle/[id].ts');
    const response = await GET({
      params: { id: validPuzzleId },
      request: new Request(`http://localhost/api/puzzle/${validPuzzleId}`),
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(404);
    expect(body.error).toBe('Puzzle not found or not yet released');

    const puzzleQuery = queries.find(q => q.table === 'puzzles');
    expect(puzzleQuery).toBeTruthy();
    expect(puzzleQuery?.filters.some(f => f.kind === 'lte' && f.column === 'release_date')).toBe(true);
  });

  it('POST /api/submit blocks unreleased puzzles', async () => {
    state.getCurrentUser.mockResolvedValue(null);
    state.supabaseAdmin = createSupabaseAdminMock((query) => {
      if (query.table === 'puzzles' && query.terminal === 'single') {
        return { data: null, error: { message: 'not found' } };
      }
      return { data: [], error: null };
    });

    const { POST } = await import('../src/pages/api/submit.ts');
    const response = await POST({
      request: new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzle_id: validPuzzleId, answer: '42' }),
      }),
      cookies: cookieStore() as never,
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(404);
    expect(body.error).toBe('Puzzle not found or not yet released');
  });

  it('POST /api/submit returns duplicate=true on unique violation for human correct submission', async () => {
    state.getCurrentUser.mockResolvedValue({ id: 'user-1' });

    state.supabaseAdmin = createSupabaseAdminMock((query) => {
      if (query.table === 'puzzle_sessions' && query.terminal === 'maybeSingle') {
        return { data: { id: 'human-session' }, error: null };
      }

      if (query.table === 'submissions' && query.columns === 'score, submitted_at' && query.terminal === 'maybeSingle') {
        return { data: null, error: null };
      }

      if (query.table === 'submissions' && query.terminal === 'head') {
        return { data: null, error: null, count: 0 };
      }

      if (query.table === 'puzzles' && query.terminal === 'single') {
        return { data: { id: validPuzzleId, answer_hash: 'hash-match' }, error: null };
      }

      if (query.table === 'submissions' && query.columns === 'time_ms, tokens_used' && query.terminal === 'many') {
        return { data: [], error: null };
      }

      if (query.table === 'submissions' && query.op === 'insert' && query.terminal === 'single') {
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
      }

      if (query.table === 'submissions' && query.columns === 'score' && query.terminal === 'maybeSingle') {
        return { data: { score: 88 }, error: null };
      }

      return { data: null, error: null };
    });

    const { POST } = await import('../src/pages/api/submit.ts');
    const response = await POST({
      request: new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'token-1' },
        body: JSON.stringify({ puzzle_id: validPuzzleId, answer: 'correct-answer' }),
      }),
      cookies: cookieStore('token-1') as never,
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(200);
    expect(body.correct).toBe(true);
    expect(body.duplicate).toBe(true);
    expect(body.score).toBe(88);
  });

  it('POST /api/agents rejects missing CSRF token', async () => {
    const { POST } = await import('../src/pages/api/agents/index.ts');
    const response = await POST({
      request: new Request('http://localhost/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'my-agent' }),
      }),
      cookies: cookieStore() as never,
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(403);
    expect(body.code).toBe('CSRF_INVALID');
  });

  it('POST /api/puzzle/start-challenge rejects invalid UUID', async () => {
    state.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    const { POST } = await import('../src/pages/api/puzzle/start-challenge.ts');
    const response = await POST({
      request: new Request('http://localhost/api/puzzle/start-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'token-1' },
        body: JSON.stringify({ puzzle_id: 'not-a-uuid' }),
      }),
      cookies: cookieStore('token-1') as never,
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_INPUT');
  });

  it('POST /api/puzzle/start-challenge returns session and variant', async () => {
    state.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    state.supabaseAdmin = createSupabaseAdminMock((query) => {
      if (query.table === 'puzzles' && query.terminal === 'single') {
        return { data: { id: validPuzzleId, release_date: '2026-01-01' }, error: null };
      }

      if (query.table === 'puzzle_sessions' && query.op === 'select' && query.terminal === 'single') {
        return { data: null, error: { message: 'not found' } };
      }

      if (query.table === 'puzzle_sessions' && query.op === 'insert' && query.terminal === 'single') {
        return { data: { id: validSessionId, variant_id: 'minimal-safe-fix', variant_title: 'Minimal Safe Fix' }, error: null };
      }

      return { data: null, error: null };
    });

    const { POST } = await import('../src/pages/api/puzzle/start-challenge.ts');
    const response = await POST({
      request: new Request('http://localhost/api/puzzle/start-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'token-1' },
        body: JSON.stringify({ puzzle_id: validPuzzleId }),
      }),
      cookies: cookieStore('token-1') as never,
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(201);
    expect(body.session_id).toBe(validSessionId);
    expect(typeof body.variant).toBe('object');
    expect((body.variant as { id: string }).id).toBe('minimal-safe-fix');
  });

  it('GET /api/leaderboard/:puzzleId rejects invalid UUID', async () => {
    const { GET } = await import('../src/pages/api/leaderboard/[puzzleId].ts');
    const response = await GET({
      params: { puzzleId: 'bad-id' },
      request: new Request('http://localhost/api/leaderboard/bad-id'),
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_INPUT');
  });

  it('GET /api/leaderboard paginates results with page and limit', async () => {
    state.supabase = {
      rpc: vi.fn(async () => ({
        data: Array.from({ length: 10 }, (_, i) => ({
          rank: i + 1,
          github_login: `user${i + 1}`,
          agent_name: `agent-${i + 1}`,
          total_score: 100 - i,
          puzzles_solved: i + 1,
          model: 'model',
          avg_time_ms: 1000,
          avg_tokens: 200,
        })),
        error: null,
      })),
    };

    const { GET } = await import('../src/pages/api/leaderboard/index.ts');
    const response = await GET({
      request: new Request('http://localhost/api/leaderboard?page=2&limit=3'),
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(200);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(3);
    expect(Array.isArray(body.entries)).toBe(true);
    expect((body.entries as unknown[]).length).toBe(3);
    expect((body.entries as Array<{ rank: number }>)[0].rank).toBe(4);
  });
});
