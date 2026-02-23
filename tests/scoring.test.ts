import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  computeSpeedBonus,
  computeEfficiencyBonus,
} from '../src/lib/scoring';

// ── calculateScore ────────────────────────────────────────────────────────────

describe('calculateScore', () => {
  it('correct answer gets 50pts correctness score', () => {
    const result = calculateScore({ correct: true });
    expect(result.correctness_score).toBe(50);
  });

  it('wrong answer gets 0 total', () => {
    const result = calculateScore({
      correct: false,
      time_ms: 1000,
      best_time_ms: 500,
      tokens_used: 100,
      best_tokens: 50,
    });
    expect(result.total).toBe(0);
    expect(result.correctness_score).toBe(0);
    expect(result.speed_bonus).toBe(0);
    expect(result.efficiency_bonus).toBe(0);
  });

  it('correct with no time_ms gives partial speed bonus (10)', () => {
    const result = calculateScore({ correct: true, time_ms: null });
    expect(result.speed_bonus).toBe(10);
  });

  it('correct with no tokens_used gives partial efficiency bonus (7)', () => {
    const result = calculateScore({ correct: true, tokens_used: null });
    expect(result.efficiency_bonus).toBe(7);
  });

  it('correct matching best time gets max speed bonus (30)', () => {
    const result = calculateScore({ correct: true, time_ms: 1000, best_time_ms: 1000 });
    expect(result.speed_bonus).toBe(30);
  });

  it('correct 2× slower than best gets half speed bonus (15)', () => {
    const result = calculateScore({ correct: true, time_ms: 2000, best_time_ms: 1000 });
    expect(result.speed_bonus).toBe(15);
  });

  it('correct matching best tokens gets max efficiency bonus (20)', () => {
    const result = calculateScore({ correct: true, tokens_used: 100, best_tokens: 100 });
    expect(result.efficiency_bonus).toBe(20);
  });

  it('correct 2× more tokens than best gets half efficiency bonus (10)', () => {
    const result = calculateScore({ correct: true, tokens_used: 200, best_tokens: 100 });
    expect(result.efficiency_bonus).toBe(10);
  });

  it('total score never exceeds 100', () => {
    const result = calculateScore({
      correct: true,
      time_ms: 1,
      best_time_ms: 1,
      tokens_used: 1,
      best_tokens: 1,
    });
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.total).toBe(100); // 50 + 30 + 20
  });

  it('handles undefined time_ms and tokens_used gracefully', () => {
    const result = calculateScore({ correct: true, time_ms: undefined, tokens_used: undefined });
    expect(result.total).toBe(67); // 50 + 10 + 7
    expect(result.speed_bonus).toBe(10);
    expect(result.efficiency_bonus).toBe(7);
  });
});

// ── computeSpeedBonus ─────────────────────────────────────────────────────────

describe('computeSpeedBonus', () => {
  it('no time provided → 10 (partial credit)', () => {
    expect(computeSpeedBonus(null, 1000)).toBe(10);
    expect(computeSpeedBonus(undefined, 1000)).toBe(10);
  });

  it('first submission (no best time) → 30 (max)', () => {
    expect(computeSpeedBonus(1000, null)).toBe(30);
    expect(computeSpeedBonus(1000, undefined)).toBe(30);
    expect(computeSpeedBonus(1000, 0)).toBe(30);
  });

  it('matches best time → max (30)', () => {
    expect(computeSpeedBonus(1000, 1000)).toBe(30);
  });

  it('faster than best → capped at max (30)', () => {
    expect(computeSpeedBonus(500, 1000)).toBe(30);
  });

  it('2× slower than best → 15', () => {
    expect(computeSpeedBonus(2000, 1000)).toBe(15);
  });

  it('10× slower than best → 3', () => {
    expect(computeSpeedBonus(10000, 1000)).toBe(3);
  });
});

// ── computeEfficiencyBonus ────────────────────────────────────────────────────

describe('computeEfficiencyBonus', () => {
  it('no tokens provided → 7 (partial credit)', () => {
    expect(computeEfficiencyBonus(null, 100)).toBe(7);
    expect(computeEfficiencyBonus(undefined, 100)).toBe(7);
  });

  it('first submission (no best tokens) → 20 (max)', () => {
    expect(computeEfficiencyBonus(100, null)).toBe(20);
    expect(computeEfficiencyBonus(100, undefined)).toBe(20);
    expect(computeEfficiencyBonus(100, 0)).toBe(20);
  });

  it('matches best tokens → max (20)', () => {
    expect(computeEfficiencyBonus(100, 100)).toBe(20);
  });

  it('fewer tokens than best → capped at max (20)', () => {
    expect(computeEfficiencyBonus(50, 100)).toBe(20);
  });

  it('2× more tokens than best → 10', () => {
    expect(computeEfficiencyBonus(200, 100)).toBe(10);
  });
});
