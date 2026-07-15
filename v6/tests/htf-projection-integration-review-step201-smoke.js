import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_HTF_PROJECTION_INTEGRATION_REVIEW_STEP201.md');
const readinessDoc = await read('v6/docs/V6_DISPLAY_TIMEFRAME_READINESS_AUDIT_STEP192.md');
const regressionPack = await read('v6/tests/chart-browser-regression-pack.js');
const projectionRuntime = await read('v6/src/chart-data-projection/chart-data-projection-runtime.js');
const projectionDomain = await read('v6/src/chart-data-projection/chart-data-projection-domain.js');
const preparationRuntime = await read('v6/src/chart-entry/chart-entry-projection-preparation-runtime.js');
const paneReloadChartData = await read('v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js');
const manualNext = await read('v6/src/chart-entry/chart-entry-manual-next-runtime.js');
const leftwardHistory = await read('v6/src/chart-history/leftward-history-extension-runtime.js');
const leftwardHistoryData = await read('v6/src/chart-history/leftward-history-data-orchestrator.js');
const autoPlay = await read('v6/src/chart-entry/chart-entry-auto-play-runtime.js');
const resetBridge = await read('v6/src/chart-engine/reset-view-control-bridge.js');
const chartDataRuntime = await read('v6/src/chart-data/chart-data-runtime.js');
const chartEngineBridge = await read('v6/src/chart-engine/chart-data-surface-bridge.js');

[
  'Step 193 - Projection Domain',
  'Step 194 - Projection Runtime',
  'Step 195 - Initial Chart Entry',
  'Step 196 - Pane Reload',
  'Step 197 - Manual Next',
  'Step 198 - Leftward History',
  'Step 199 - Auto-Play',
  'Step 200 - Reset View',
  'Step 202 Recommendation',
].forEach((text) => assert.match(doc, new RegExp(text)));

assert.match(readinessDoc, /auto-play-htf-visible-latency-browser-step199-smoke\.js/);
assert.match(readinessDoc, /reset-view-htf-browser-step200-smoke\.js/);

[
  'initial-htf-chart-entry-browser-step195-smoke.js',
  'pane-reload-htf-projection-browser-step196-smoke.js',
  'manual-next-htf-visible-latency-browser-step197-smoke.js',
  'leftward-history-htf-stability-browser-step198-smoke.js',
  'auto-play-htf-visible-latency-browser-step199-smoke.js',
  'reset-view-htf-browser-step200-smoke.js',
].forEach((testName) => assert.equal(regressionPack.includes(testName), true));

assert.equal(projectionRuntime.includes('CHART_DATA_PROJECTION_COMMANDS.PROJECT'), true);
assert.equal(projectionDomain.includes('projectSourceBarsToChartData'), true);

[
  preparationRuntime,
  paneReloadChartData,
  preparationRuntime,
  leftwardHistoryData,
].forEach((text) => assert.equal(text.includes('CHART_DATA_PROJECTION_COMMANDS.PROJECT'), true));

assert.equal(manualNext.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(leftwardHistory.includes('CHART_DATA_PROJECTION_COMMANDS'), false);

[
  autoPlay,
  resetBridge,
  chartDataRuntime,
  chartEngineBridge,
].forEach((text) => {
  assert.equal(text.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
  assert.equal(text.includes('chartDataProjection.'), false);
});

assert.equal(autoPlay.includes('CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT'), true);
assert.equal(resetBridge.includes('findAppliedChartData'), true);

console.log('v6 HTF projection integration review step 201 smoke passed');
