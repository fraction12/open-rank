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
  getCurrentUser: vi.fn(),
  getAgentByKey: vi.fn(),
};

const mockCheckRateLimit = vi.fn(async () => ({ allowed: true }));
const mockSaltedHash = vi.fn(async () => 'hash-match');

vi.mock('../src/lib/supabase', () => ({
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

describe('API integration: release gating and duplicate handling', () => {
  beforeEach(() => {
    state.supabaseAdmin = null;
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
      params: { id: 'future-puzzle-id' },
      request: new Request('http://localhost/api/puzzle/future-puzzle-id'),
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
        body: JSON.stringify({ puzzle_id: 'future-puzzle-id', answer: '42' }),
      }),
      cookies: {} as never,
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
        return { data: { id: 'p-1', answer_hash: 'hash-match' }, error: null };
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzle_id: 'p-1', answer: 'correct-answer' }),
      }),
      cookies: {} as never,
    } as never);

    const body = await readJson(response);
    expect(response.status).toBe(200);
    expect(body.correct).toBe(true);
    expect(body.duplicate).toBe(true);
    expect(body.score).toBe(88);
  });
});
