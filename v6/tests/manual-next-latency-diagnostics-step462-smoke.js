import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(
  'v6/src/chart-entry/chart-entry-manual-next-runtime.js',
  'utf8',
);
const browserGate = await readFile(
  'v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js',
  'utf8',
);

for (const phase of ['setupMs', 'sourceAdvanceMs', 'materializationMs', 'totalMs']) {
  assert.equal(runtime.includes(phase), true, `${phase} must be captured by the owner`);
  assert.equal(browserGate.includes(phase) || browserGate.includes('diagnostics'), true);
}

assert.equal(runtime.includes('diagnostics: advanced.diagnostics ? { ...advanced.diagnostics } : null'), true);
assert.equal(browserGate.includes('exceeded 160ms;'), true);

console.log('v6 manual next latency diagnostics step462 smoke passed');
