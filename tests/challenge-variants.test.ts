import { describe, expect, it } from 'vitest';
import { selectChallengeVariant } from '../src/lib/challenge-variants';

describe('selectChallengeVariant', () => {
  it('is deterministic for the same seed', () => {
    const a = selectChallengeVariant('puzzle:user:session');
    const b = selectChallengeVariant('puzzle:user:session');
    expect(a.id).toBe(b.id);
    expect(a.title).toBe(b.title);
  });

  it('returns a variant with three hints', () => {
    const variant = selectChallengeVariant('another-seed');
    expect(variant.id.length).toBeGreaterThan(0);
    expect(Array.isArray(variant.hintTrack)).toBe(true);
    expect(variant.hintTrack).toHaveLength(3);
  });
});
