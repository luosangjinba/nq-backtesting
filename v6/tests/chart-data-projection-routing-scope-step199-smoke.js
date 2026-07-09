import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const autoPlay = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const manualNext = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const chartDataRuntime = await readFile('v6/src/chart-data/chart-data-runtime.js', 'utf8');
const chartDataStore = await readFile('v6/src/chart-data/chart-data-store.js', 'utf8');
const chartBars = await readFile('v6/src/chart-data/chart-bars.js', 'utf8');
const regressionPack = await readFile('v6/tests/chart-browser-regression-pack.js', 'utf8');
const resetBridge = await readFile('v6/src/chart-engine/reset-view-control-bridge.js', 'utf8');

assert.equal(autoPlay.includes('CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT'), true);
assert.equal(autoPlay.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(autoPlay.includes('CHART_DATA_COMMANDS'), false);
assert.equal(autoPlay.includes('BAR_DATA_COMMANDS'), false);

assert.equal(manualNext.includes('CHART_DATA_PROJECTION_COMMANDS.PROJECT'), true);
assert.equal(manualNext.includes('projectionSource'), true);
assert.equal(chartBars.includes('mergeOrderedBars'), true);
assert.equal(chartDataStore.includes('mergeChartBars(bars, current.bars'), true);
assert.equal(regressionPack.includes('auto-play-htf-visible-latency-browser-step199-smoke.js'), true);

[
  chartDataRuntime,
  chartDataStore,
  resetBridge,
].forEach((text) => {
  assert.equal(text.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
  assert.equal(text.includes('chartDataProjection.'), false);
});

console.log('v6 chart data projection routing scope step 199 smoke passed');
