import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile('v6/src/app.js', 'utf8');
const preparationRuntime = await readFile('v6/src/chart-entry/chart-entry-projection-preparation-runtime.js', 'utf8');
const applyRuntime = await readFile('v6/src/chart-entry/chart-entry-projection-apply-runtime.js', 'utf8');
const manualNext = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlay = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const paneReloadChartData = await readFile('v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js', 'utf8');
const leftwardHistory = await readFile('v6/src/chart-history/leftward-history-extension-runtime.js', 'utf8');
const resetBridge = await readFile('v6/src/chart-engine/reset-view-control-bridge.js', 'utf8');
const chartDataRuntime = await readFile('v6/src/chart-data/chart-data-runtime.js', 'utf8');
const chartDataSurfaceBridge = await readFile('v6/src/chart-engine/chart-data-surface-bridge.js', 'utf8');

assert.equal(app.includes('createChartDataProjectionRuntime'), true);
assert.equal(app.includes("from './chart-data-projection/chart-data-projection-runtime.js'"), true);
assert.equal(preparationRuntime.includes('CHART_DATA_PROJECTION_COMMANDS'), true);
assert.equal(preparationRuntime.includes('CHART_DATA_PROJECTION_COMMANDS.PROJECT'), true);

[
  applyRuntime,
  manualNext,
  autoPlay,
  paneReloadChartData,
  leftwardHistory,
  resetBridge,
  chartDataRuntime,
  chartDataSurfaceBridge,
].forEach((text) => {
  assert.equal(text.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
  assert.equal(text.includes('chartDataProjection.'), false);
});

assert.match(
  manualNext,
  /const timeframe = pane\.displayTimeframe \|\| replayState\.timeframe/,
  'Step 195 must not route manual-next through projection owner yet.',
);
assert.match(
  paneReloadChartData,
  /bars: loadedWindow\.bars/,
  'Step 195 must not route pane reload replacement through projection owner yet.',
);

console.log('v6 chart data projection routing scope step 195 smoke passed');
