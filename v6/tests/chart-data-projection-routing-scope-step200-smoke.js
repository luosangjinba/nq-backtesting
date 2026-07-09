import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const resetBridge = await readFile('v6/src/chart-engine/reset-view-control-bridge.js', 'utf8');
const viewportRuntime = await readFile('v6/src/chart-viewport/chart-viewport-runtime.js', 'utf8');
const viewportStore = await readFile('v6/src/chart-viewport/chart-viewport-store.js', 'utf8');
const chartEngineBridge = await readFile('v6/src/chart-engine/chart-viewport-surface-bridge.js', 'utf8');
const regressionPack = await readFile('v6/tests/chart-browser-regression-pack.js', 'utf8');

assert.equal(resetBridge.includes('findAppliedChartData'), true);
assert.equal(resetBridge.includes('findPaneSnapshot'), true);
assert.equal(resetBridge.includes('latestLogicalIndex'), true);
assert.equal(resetBridge.includes('chartSurface.getState'), true);
assert.equal(resetBridge.includes('CHART_VIEWPORT_COMMANDS.RESET_VIEW'), true);

[
  resetBridge,
  viewportRuntime,
  viewportStore,
  chartEngineBridge,
].forEach((text) => {
  assert.equal(text.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
  assert.equal(text.includes('BAR_DATA_COMMANDS'), false);
  assert.equal(text.includes('chartDataProjection.'), false);
});

assert.equal(resetBridge.includes('REPLAY_COMMANDS'), false);
assert.equal(regressionPack.includes('reset-view-htf-browser-step200-smoke.js'), true);

console.log('v6 chart data projection routing scope step 200 smoke passed');
