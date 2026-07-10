import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP275.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');

const requiredMembers = [
  'display-timeframe-browser-smoke.js',
  'timeframe-menu-parity-browser-smoke.js',
  'display-timeframe-leftward-auto-chain-browser-smoke.js',
  'daily-projection-browser-step268-smoke.js',
  'weekly-projection-browser-step269-smoke.js',
  'monthly-projection-browser-step270-smoke.js',
  'replay-gap-browser-regression-pack-step274-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Timeframe/Replay Foundation Regression Runner',
  'Steps 264-274',
  'not a missing replay-gap variant',
  'Display-timeframe capability registry owns supported interval metadata',
  'Chart-data projection runtime owns display bars and session-aware buckets',
  'Runtime behavior is unchanged in Step 275',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(index, /V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP275/);
assert.match(todo, /Step 275 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Status: proposed/);

console.log('v6 chart foundation next slice selection step275 smoke passed');
