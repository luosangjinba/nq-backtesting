import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');

assert.equal(displayRuntime.includes('BAR_DATA_COMMANDS'), false);
assert.equal(displayRuntime.includes('createChart'), false);
assert.equal(displayRuntime.includes('setData'), false);
assert.equal(displayRuntime.includes('series.update'), false);

console.log('v6 display timeframe no feature step 192 smoke passed');
