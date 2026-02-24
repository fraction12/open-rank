type HumanRubricInput = {
  attemptNumber: number | null | undefined;
  rootCause?: string | null;
  fixPlan?: string | null;
  verificationSteps?: string | null;
  confidenceLevel?: number | null;
  hintsUsed?: number | null;
};

export type HumanRubricScore = {
  attemptScore: number;
  processScore: number;
  verificationScore: number;
  total: number;
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function containsOneOf(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function scoreAttempt(attemptNumber: number | null | undefined): number {
  if (!attemptNumber || attemptNumber <= 0) return 0;
  if (attemptNumber === 1) return 8;
  if (attemptNumber === 2) return 4;
  if (attemptNumber === 3) return 2;
  return 0;
}

function scoreProcess(rootCause: string, fixPlan: string, confidenceLevel: number | null | undefined): number {
  let score = 0;

  if (wordCount(rootCause) >= 12) score += 3;
  if (containsOneOf(rootCause, ['because', 'caused', 'fails', 'condition', 'state', 'null', 'undefined'])) score += 2;

  if (wordCount(fixPlan) >= 12) score += 2;
  if (containsOneOf(fixPlan, ['patch', 'guard', 'check', 'refactor', 'rollback', 'scope'])) score += 1;

  if (confidenceLevel != null && confidenceLevel >= 1 && confidenceLevel <= 5) score += 1;

  return Math.min(8, score);
}

function scoreVerification(verificationSteps: string): number {
  let score = 0;
  if (wordCount(verificationSteps) >= 10) score += 2;
  if (containsOneOf(verificationSteps, ['test', 'assert', 'repro', 'verify', 'build', 'lint', 'unit', 'integration'])) score += 2;
  return Math.min(4, score);
}

export function computeHumanRubricScore(input: HumanRubricInput): HumanRubricScore {
  const rootCause = (input.rootCause ?? '').trim();
  const fixPlan = (input.fixPlan ?? '').trim();
  const verificationSteps = (input.verificationSteps ?? '').trim();

  const attemptScore = scoreAttempt(input.attemptNumber);
  const processScore = scoreProcess(rootCause, fixPlan, input.confidenceLevel ?? null);
  const verificationScore = scoreVerification(verificationSteps);

  const hintPenalty = Math.min(4, Math.max(0, input.hintsUsed ?? 0)) * 1;
  const total = Math.max(0, Math.min(20, attemptScore + processScore + verificationScore - hintPenalty));

  return {
    attemptScore,
    processScore,
    verificationScore,
    total,
  };
}
