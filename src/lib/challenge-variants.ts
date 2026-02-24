export type ChallengeVariant = {
  id: string;
  title: string;
  brief: string;
  successCriteria: string;
  hintTrack: [string, string, string];
};

const VARIANTS: ChallengeVariant[] = [
  {
    id: 'root-cause-first',
    title: 'Root Cause First',
    brief: 'Prioritize diagnosis quality before proposing any patch.',
    successCriteria: 'Explain the causal chain and isolate the smallest failing condition.',
    hintTrack: [
      'Start by identifying exactly where observed behavior diverges from expected behavior.',
      'List one concrete failing path before suggesting a fix.',
      'Name the single line or condition that most directly triggers the issue.',
    ],
  },
  {
    id: 'minimal-safe-fix',
    title: 'Minimal Safe Fix',
    brief: 'Optimize for smallest safe patch with low regression risk.',
    successCriteria: 'Propose the narrowest patch and justify why broader changes are unnecessary.',
    hintTrack: [
      'Scope your change to one module if possible.',
      'Prefer additive guards over broad refactors.',
      'State one regression your patch explicitly avoids.',
    ],
  },
  {
    id: 'regression-shield',
    title: 'Regression Shield',
    brief: 'Demonstrate strong verification and risk containment.',
    successCriteria: 'Include at least one deterministic verification step and one edge-case check.',
    hintTrack: [
      'Write the shortest reproducible check first.',
      'Cover one happy-path and one edge-path validation.',
      'Explain what would fail if your fix were incomplete.',
    ],
  },
  {
    id: 'edge-case-hunter',
    title: 'Edge-Case Hunter',
    brief: 'Treat edge cases as first-class constraints.',
    successCriteria: 'Name key edge cases and confirm the proposed fix handles them.',
    hintTrack: [
      'Identify at least two non-happy-path inputs.',
      'Check null/empty/out-of-range behavior explicitly.',
      'State which edge case is most likely in production and why.',
    ],
  },
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function selectChallengeVariant(seed: string): ChallengeVariant {
  const index = hashSeed(seed) % VARIANTS.length;
  return VARIANTS[index];
}
