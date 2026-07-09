import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const preparationRuntime = await readFile('v6/src/chart-entry/chart-entry-projection-preparation-runtime.js', 'utf8');
const paneReloadChartData = await readFile('v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js', 'utf8');
const applyRuntime = await readFile('v6/src/chart-entry/chart-entry-projection-apply-runtime.js', 'utf8');
const autoPlay = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const leftwardHistory = await readFile('v6/src/chart-history/leftward-history-extension-runtime.js', 'utf8');
const resetBridge = await readFile('v6/src/chart-engine/reset-view-control-bridge.js', 'utf8');
const chartDataRuntime = await readFile('v6/src/chart-data/chart-data-runtime.js', 'utf8');
const chartDataSurfaceBridge = await readFile('v6/src/chart-engine/chart-data-surface-bridge.js', 'utf8');

assert.equal(preparationRuntime.includes('CHART_DATA_PROJECTION_COMMANDS.PROJECT'), true);
assert.equal(paneReloadChartData.includes('CHART_DATA_PROJECTION_COMMANDS.PROJECT'), true);
assert.equal(paneReloadChartData.includes('createReplacementBars'), true);

[
  applyRuntime,
  autoPlay,
  leftwardHistory,
  resetBridge,
  chartDataRuntime,
  chartDataSurfaceBridge,
].forEach((text) => {
  assert.equal(text.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
  assert.equal(text.includes('chartDataProjection.'), false);
});

console.log('v6 chart data projection routing scope step 196 smoke passed');
