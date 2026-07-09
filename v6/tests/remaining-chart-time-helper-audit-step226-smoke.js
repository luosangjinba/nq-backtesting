import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_REMAINING_CHART_TIME_HELPER_AUDIT_STEP226.md');
const todo = await read('v6/TODO.md');
const displayTimeframeRuntime = await read('v6/src/display-timeframe/display-timeframe-runtime.js');
const defaultWallRuntime = await read('v6/src/default-wall/default-wall-runtime.js');
const defaultWallReplay = await read('v6/src/default-wall/default-wall-replay.js');
const chartBars = await read('v6/src/chart-data/chart-bars.js');

for (const required of [
  'Step 226 is an audit step, not an implementation step',
  'SMC/ICT-focused',
  'display-timeframe-runtime.js',
  'default-wall-runtime.js',
  'default-wall-replay.js',
  'chart-bars.js',
  'chart-entry-context-plan.js',
  'shell/session UI',
  'journal and journal persistence',
  'normalizeUnixSeconds',
  'normalizeMinuteTimeframe',
  'summarizeProjectionSource',
  'Step 227',
  'Do not add new TFs',
  'Do not add indicators',
  'Do not migrate default-wall',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 226 - Remaining Chart Time Helper Closure Audit/);

for (const [source, evidence] of [
  [displayTimeframeRuntime, 'function latestTimestamp'],
  [displayTimeframeRuntime, 'projectionSource'],
  [defaultWallRuntime, 'function normalizeDisplayTimeframe'],
  [defaultWallReplay, 'function normalizeBar'],
  [chartBars, 'function normalizeCursorTimestamp'],
]) {
  assert.match(source, new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log('v6 remaining chart time helper audit step 226 smoke passed');
