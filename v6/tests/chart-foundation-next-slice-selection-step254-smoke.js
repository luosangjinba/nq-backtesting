import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP254.md');
const todo = await read('v6/TODO.md');
const productDirection = await read('v6/docs/V6_PRODUCT_DIRECTION.md');
const step253Doc = await read('v6/docs/V6_MULTI_PANE_CHART_FOUNDATION_REGRESSION_PACK_STEP253.md');
const dateRangeEntry = await read('v6/tests/date-range-entry-viewport-alignment-step247-smoke.js');
const boundaryMetadata = await read('v6/tests/real-date-boundary-metadata-browser-step190-smoke.js');
const chartEntryVisibility = await read('v6/tests/chart-entry-initial-visibility-browser-smoke.js');
const playbackBoundary = await read('v6/tests/chart-entry-playback-period-boundary-browser-smoke.js');
const realDateGap = await read('v6/tests/real-date-leftward-gap-browser-step189-smoke.js');

const normalizedDoc = doc.replace(/\s+/g, ' ');

for (const required of [
  'Date Range / Loaded Boundary / Replay Entry Regression Pack',
  'creating a session with a date range must not load the full selected range',
  'actual loaded boundary must be visible',
  'chart entry must align the initial viewport',
  'replay cursor/revealed state must start from the selected session boundary',
  'real-date leftward extension must understand loaded and empty boundary metadata',
  'Session runtime owns selected session start/end metadata',
  'Chart-entry runtime owns bounded initial load planning',
  'Bar-data runtime owns database/cache requests',
  'Chart-data runtime owns pane-local bars',
  'Chart viewport owns initial/default viewport projection',
  'Replay runtime owns cursor/reveal state',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 254 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 255 - Date Range \/ Loaded Boundary \/ Replay Entry Regression Pack/);
assert.match(productDirection, /load chart data from the database\/API boundary/);
assert.match(step253Doc, /Multi-Pane Chart Foundation Regression Pack/);

for (const [content, required] of [
  [dateRangeEntry, 'context.loaded.plannedWindow.bounded'],
  [dateRangeEntry, 'latestVisible'],
  [dateRangeEntry, 'replay.cursorTime, value.session.startTime'],
  [boundaryMetadata, 'GET_BOUNDARY_METADATA'],
  [boundaryMetadata, 'emptyWindowCount'],
  [chartEntryVisibility, 'candlePixelCount'],
  [chartEntryVisibility, 'latestVisible'],
  [playbackBoundary, 'playbackPeriod.setPeriod'],
  [playbackBoundary, 'resetIntent.origin'],
  [realDateGap, 'leftward'],
]) {
  assert.match(content, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log('v6 chart foundation next slice selection step 254 smoke passed');
