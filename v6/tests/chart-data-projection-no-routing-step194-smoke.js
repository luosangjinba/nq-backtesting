import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const chartDataRuntime = await readFile('v6/src/chart-data/chart-data-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNext = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlay = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const leftwardHistory = await readFile('v6/src/chart-history/leftward-history-extension-runtime.js', 'utf8');
const resetBridge = await readFile('v6/src/chart-engine/reset-view-control-bridge.js', 'utf8');
const chartDataSurfaceBridge = await readFile('v6/src/chart-engine/chart-data-surface-bridge.js', 'utf8');

assert.equal(chartDataRuntime.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(chartDataRuntime.includes('chartDataProjection.'), false);
assert.equal(displayRuntime.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(manualNext.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(autoPlay.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(leftwardHistory.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(resetBridge.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(chartDataSurfaceBridge.includes('CHART_DATA_PROJECTION_COMMANDS'), false);

assert.match(
  manualNext,
  /const timeframe = pane\.displayTimeframe \|\| replayState\.timeframe/,
  'Step 194 must not route manual-next through projection owner yet.',
);
console.log('v6 chart data projection no routing step 194 smoke passed');
