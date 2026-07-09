import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

const retiredProjection = await readOptional('v6/src/display-timeframe/display-timeframe-projection.js');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const defaultWallProjection = await readFile('v6/src/default-wall/default-wall-pane-projection.js', 'utf8');

assert.equal(retiredProjection, null);
assert.equal(displayRuntime.includes('projectBarsToDisplayTimeframe'), false);
assert.equal(displayRuntime.includes('CHART_DATA_PROJECTION_COMMANDS.PROJECT'), true);
assert.equal(defaultWallProjection.includes('projectBarsToDisplayTimeframe'), false);
assert.equal(defaultWallProjection.includes('projectSourceBarsToChartData'), true);

console.log('v6 display timeframe projection retired smoke passed');
