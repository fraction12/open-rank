#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:4321';

const checks = [
  { path: '/', expectedStatus: 200 },
  { path: '/api/puzzle/today', expectedStatus: [200, 404] },
  { path: '/api/leaderboard', expectedStatus: 200 },
];

function okStatus(actual, expected) {
  if (Array.isArray(expected)) return expected.includes(actual);
  return actual === expected;
}

async function runCheck(check) {
  const url = new URL(check.path, baseUrl).toString();
  const started = Date.now();
  const response = await fetch(url);
  const duration = Date.now() - started;

  if (!okStatus(response.status, check.expectedStatus)) {
    throw new Error(`${check.path} failed: expected ${JSON.stringify(check.expectedStatus)}, got ${response.status}`);
  }

  console.log(`OK ${check.path} status=${response.status} duration_ms=${duration}`);
}

async function main() {
  console.log(`Running smoke tests against ${baseUrl}`);
  for (const check of checks) {
    await runCheck(check);
  }
}

main().catch((err) => {
  console.error(`Smoke test failed: ${err.message}`);
  process.exit(1);
});
