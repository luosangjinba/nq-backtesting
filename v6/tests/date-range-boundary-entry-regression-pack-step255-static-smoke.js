import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_DATE_RANGE_BOUNDARY_ENTRY_REGRESSION_PACK_STEP255.md');
const pack = await read('v6/tests/date-range-boundary-entry-regression-pack-step255-smoke.js');
const todo = await read('v6/TODO.md');
const selection = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP254.md');

const requiredMembers = [
  'date-range-entry-viewport-alignment-step247-smoke.js',
  'real-date-boundary-metadata-browser-step190-smoke.js',
  'chart-entry-initial-visibility-browser-smoke.js',
  'chart-entry-playback-period-boundary-browser-smoke.js',
  'real-date-leftward-gap-browser-step189-smoke.js',
  'bar-data-boundary-metadata-step190-smoke.js',
  'chart-boundary-metadata-runtime-step191-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Date Range / Loaded Boundary / Replay Entry Regression Pack',
  'Session date ranges are stored and displayed without loading the full',
  'Loaded boundary metadata remains available',
  'Chart-entry initial viewport projection keeps the latest loaded K-line',
  'Replay starts at the selected session boundary',
  'Playback-period and reset-view behavior do not mutate replay',
  'Real-date leftward extension can cross known loaded and empty boundary',
  'Runtime boundary metadata remains owned by bar-data/chart-boundary owners',
  'No runtime behavior changes were made',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(selection, /Step 255 should implement \*\*Date Range \/ Loaded Boundary \/ Replay Entry/);
assert.match(todo, /Step 255 - Date Range \/ Loaded Boundary \/ Replay Entry Regression Pack/);
assert.match(todo, /Step 256 - Chart Foundation Next Slice Selection/);
assert.match(pack, /\[date-range-boundary-entry-pack\] start/);
assert.match(pack, /\[date-range-boundary-entry-pack\] passed/);

console.log('v6 date-range boundary entry regression pack step 255 static smoke passed');
