import { describe, expect, it } from 'vitest';
import { computeHumanRubricScore } from '../src/lib/challenge-rubric';

describe('computeHumanRubricScore', () => {
  it('gives stronger scores for structured submissions', () => {
    const score = computeHumanRubricScore({
      attemptNumber: 1,
      rootCause: 'The failure is caused because the null state bypasses a required condition check in middleware.',
      fixPlan: 'Patch with a narrow guard check and keep scope local to this function to avoid broad regressions.',
      verificationSteps: 'Repro locally, run unit test and integration test, then verify build and lint pass.',
      confidenceLevel: 4,
      hintsUsed: 0,
    });

    expect(score.attemptScore).toBe(8);
    expect(score.processScore).toBeGreaterThanOrEqual(6);
    expect(score.verificationScore).toBe(4);
    expect(score.total).toBeGreaterThanOrEqual(16);
  });

  it('applies hint penalties and attempt decay', () => {
    const score = computeHumanRubricScore({
      attemptNumber: 3,
      rootCause: 'bad value',
      fixPlan: 'try patch',
      verificationSteps: '',
      hintsUsed: 3,
      confidenceLevel: 2,
    });

    expect(score.attemptScore).toBe(2);
    expect(score.total).toBeLessThanOrEqual(4);
  });
});
