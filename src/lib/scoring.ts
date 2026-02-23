/**
 * Score calculation logic for AgentArena
 * 
 * Total score breakdown:
 * - Correctness:   50 points (binary — correct or 0)
 * - Speed bonus:   up to 30 points (based on time_ms relative to best)
 * - Efficiency:    up to 20 points (based on tokens_used relative to best)
 */

export interface ScoreInput {
  correct: boolean;
  time_ms?: number | null;
  tokens_used?: number | null;
  best_time_ms?: number | null;
  best_tokens?: number | null;
}

export interface ScoreResult {
  total: number;
  correctness_score: number;
  speed_bonus: number;
  efficiency_bonus: number;
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const correctness_score = input.correct ? 50 : 0;

  let speed_bonus = 0;
  if (input.correct && input.time_ms != null && input.best_time_ms != null && input.best_time_ms > 0) {
    // Inverse ratio: faster = higher score
    // If you match the best time → 30 pts; 10x slower → ~3 pts
    const ratio = input.best_time_ms / input.time_ms;
    speed_bonus = Math.round(Math.min(30, 30 * Math.min(ratio, 1)));
  } else if (input.correct && input.time_ms == null) {
    // No time provided — give partial credit
    speed_bonus = 10;
  }

  let efficiency_bonus = 0;
  if (input.correct && input.tokens_used != null && input.best_tokens != null && input.best_tokens > 0) {
    const ratio = input.best_tokens / input.tokens_used;
    efficiency_bonus = Math.round(Math.min(20, 20 * Math.min(ratio, 1)));
  } else if (input.correct && input.tokens_used == null) {
    efficiency_bonus = 7;
  }

  return {
    total: correctness_score + speed_bonus + efficiency_bonus,
    correctness_score,
    speed_bonus,
    efficiency_bonus,
  };
}

/**
 * Compute speed bonus when there's an existing best to compare against.
 * Called during submission — we look up the current best time/tokens first.
 */
export function computeSpeedBonus(time_ms: number | null | undefined, best_time_ms: number | null | undefined): number {
  if (time_ms == null) return 10;
  if (best_time_ms == null || best_time_ms <= 0) return 30; // you ARE the best
  const ratio = best_time_ms / time_ms;
  return Math.round(Math.min(30, 30 * Math.min(ratio, 1)));
}

export function computeEfficiencyBonus(tokens_used: number | null | undefined, best_tokens: number | null | undefined): number {
  if (tokens_used == null) return 7;
  if (best_tokens == null || best_tokens <= 0) return 20; // you ARE the best
  const ratio = best_tokens / tokens_used;
  return Math.round(Math.min(20, 20 * Math.min(ratio, 1)));
}
