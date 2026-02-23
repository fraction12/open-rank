#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const checks = [
  ['npm', ['run', 'typecheck']],
  ['npm', ['test']],
  ['npm', ['run', 'build']],
];

for (const [cmd, args] of checks) {
  const label = `${cmd} ${args.join(' ')}`;
  console.log(`\n[preflight] Running: ${label}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\n[preflight] Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[preflight] All checks passed.');
