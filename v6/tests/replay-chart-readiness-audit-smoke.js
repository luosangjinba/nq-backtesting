import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const audit = readFileSync(path.join(ROOT, 'v6/docs/V6_REPLAY_CHART_READINESS_AUDIT.md'), 'utf8');
const index = readFileSync(path.join(ROOT, 'v6/docs/INDEX.md'), 'utf8');

[
  'visible K-line delay',
  'primary/non-primary multi-pane confusion',
  'chart-entry-initial-visibility-browser-smoke.js',
  'chart-entry-manual-next-browser-smoke.js',
  'chart-entry-auto-play-browser-smoke.js',
  'chart-entry-playback-policy-browser-smoke.js',
  'visible-latency-cache-hit-browser-smoke.js',
  'default-wall-replay-browser-smoke.js',
  'manual-wall-replay-browser-smoke.js',
  'display-timeframe-browser-smoke.js',
  'mixed-timeframe-visible-latency-browser-smoke.js',
  'multi-pane-manual-wall-browser-smoke.js',
  'multi-pane-chart-host-browser-smoke.js',
  'chart-engine-browser-smoke.js',
  'boundary-smoke.js',
  'next executable step should be chart-facing',
].forEach((needle) => {
  assert.equal(audit.includes(needle), true, `${needle} should be listed in replay/chart readiness audit`);
});

assert.equal(index.includes('V6_REPLAY_CHART_READINESS_AUDIT.md'), true);

console.log('v6 replay chart readiness audit smoke passed');
