import { describe, it, expect } from 'vitest';
import { hashAnswer } from '../src/lib/hash';

describe('hashAnswer', () => {
  it('returns a 64-char hex string', async () => {
    const h = await hashAnswer('42', 'puzzle-uuid', 'test-salt');
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic', async () => {
    const h1 = await hashAnswer('hello', 'p1', 'salt');
    const h2 = await hashAnswer('hello', 'p1', 'salt');
    expect(h1).toBe(h2);
  });

  it('differs by answer', async () => {
    const h1 = await hashAnswer('a', 'p1', 'salt');
    const h2 = await hashAnswer('b', 'p1', 'salt');
    expect(h1).not.toBe(h2);
  });

  it('differs by puzzle ID', async () => {
    const h1 = await hashAnswer('a', 'p1', 'salt');
    const h2 = await hashAnswer('a', 'p2', 'salt');
    expect(h1).not.toBe(h2);
  });
});
