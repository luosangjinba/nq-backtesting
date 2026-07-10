import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP246.md');
const todo = await read('v6/TODO.md');
const productDirection = await read('v6/docs/V6_PRODUCT_DIRECTION.md');
const packDoc = await read('v6/docs/V6_REPLAY_TRANSPORT_CHAIN_REGRESSION_PACK_STEP245.md');
const dashboardBoundarySession = await read('v6/sessions/session_20260709_step232_chart_foundation_post_time_helper_slice_selection.md');
const dashboardModelSmoke = await read('v6/tests/session-dashboard-model-smoke.js');
const barDataBoundaryDoc = await read('v6/docs/V6_DATABASE_KLINE_IMPORT_BOUNDARY_STEP144.md');
const chartViewportRuntime = await read('v6/src/chart-viewport/chart-viewport-runtime.js');
const chartEntryContextRuntime = await read('v6/src/chart-entry/chart-entry-context-runtime.js');
const normalizedDoc = doc.replace(/\s+/g, ' ');
const normalizedDashboardBoundarySession = dashboardBoundarySession.replace(/\s+/g, ' ');

for (const required of [
  'Date-Range Entry Viewport Alignment Audit/Gate',
  'selected trading dates',
  'initial viewport projection',
  'Chart-entry context/bootstrap owns turning a session into bounded initial chart windows',
  'Bar-data owns actual data requests',
  'Chart viewport owns default-wall visible range intent',
  'visible logical range includes the loaded/revealed K-line cluster',
  'preserve the no-full-date-range-load rule',
  'Do not add a new date picker',
  'Do not add new timeframes',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(normalizedDoc, /actual loaded chart boundary metadata/);
assert.match(todo, /Step 246 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 247 - Date-Range Entry Viewport Alignment Audit\/Gate/);
assert.match(productDirection, /handle date ranges clearly/);
assert.match(packDoc, /passed|The pack runs|replay\/transport foundation regression pack/);
assert.match(normalizedDashboardBoundarySession, /selected trading dates/);
assert.match(normalizedDashboardBoundarySession, /actual chart data boundary|loaded boundary metadata/);
assert.match(dashboardModelSmoke, /Chart starts at/);
assert.match(barDataBoundaryDoc, /no full session\/date-range load/);
assert.match(chartViewportRuntime, /CHART_VIEWPORT_COMMANDS/);
assert.match(chartViewportRuntime, /ENSURE_INTENT|RESET_VIEW|PROJECTED/);
assert.match(chartEntryContextRuntime, /CHART_ENTRY_CONTEXT_COMMANDS/);

console.log('v6 chart foundation next slice selection step 246 smoke passed');
