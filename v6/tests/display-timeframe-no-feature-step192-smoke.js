import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNext = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const paneReloadChartData = await readFile('v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js', 'utf8');

assert.equal(await exists('v6/src/chart-data-projection'), false);
assert.equal(contracts.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(contracts.includes('chartDataProjection.'), false);
assert.equal(displayRuntime.includes('BAR_DATA_COMMANDS'), false);
assert.equal(displayRuntime.includes('createChart'), false);
assert.equal(displayRuntime.includes('setData'), false);
assert.equal(displayRuntime.includes('series.update'), false);

assert.match(
  manualNext,
  /const timeframe = pane\.displayTimeframe \|\| replayState\.timeframe/,
  'Step 192 must not silently change manual-next TF behavior before the owner audit is implemented.',
);
assert.match(
  paneReloadChartData,
  /bars: loadedWindow\.bars/,
  'Step 192 must not silently project pane reload data before chart-data projection owner exists.',
);

console.log('v6 display timeframe no feature step 192 smoke passed');
