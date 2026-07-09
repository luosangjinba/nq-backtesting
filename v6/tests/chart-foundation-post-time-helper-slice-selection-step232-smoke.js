import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_POST_TIME_HELPER_SLICE_SELECTION_STEP232.md');
const todo = await read('v6/TODO.md');
const step188 = await read('v6/docs/V6_GLOBEX_SESSION_BOUNDARY_CLARITY_STEP188.md');
const dashboardModel = await read('v6/src/shell/session-dashboard-model.js');
const dashboardModelSmoke = await read('v6/tests/session-dashboard-model-smoke.js');
const boundaryBridgeSmoke = await read('v6/tests/session-dashboard-boundary-bridge-browser-step191-smoke.js');

for (const required of [
  'Dashboard Chart Boundary Label Product Wording',
  'bounded chart-foundation presentation slice',
  'Chart data from loaded boundary',
  'Chart starts at',
  'prior Sunday Globex open',
  'date range clarity',
  'Session dashboard model owns display-only date/boundary labels',
  'Bar-data runtime remains the only owner of bar requests',
  'do not request bars',
  'Do not add new TFs',
  'Do not move chart series writes',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 232 - Chart Foundation Post Time-Helper Slice Selection/);
assert.match(todo, /Step 233 - Dashboard Chart Boundary Label Product Wording/);
assert.match(step188, /Trading dates/);
assert.match(step188, /Chart data boundary/);
assert.match(dashboardModel, /chartDataBoundaryLabel/);
assert.match(dashboardModel, /hasActualChartDataBoundary/);
assert.match(dashboardModel, /hasPriorGlobexOpen/);
assert.match(dashboardModelSmoke, /Chart data from loaded boundary/);
assert.match(boundaryBridgeSmoke, /Chart data from loaded boundary/);

console.log('v6 chart foundation post time-helper slice selection step 232 smoke passed');
