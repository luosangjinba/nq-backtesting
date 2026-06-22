import assert from 'node:assert/strict';
import { locatePdaProjection } from '../src/pda/pda-locate-actions.js';

let result = locatePdaProjection({ sourceChartId: 'comparison-window', startTime: 100, endTime: 200 });
assert.equal(result.located, false);
assert.equal(result.primary.located, false);
assert.equal(result.secondary.located, false);
assert.equal(result.comparison.located, false);
assert.deepEqual(result.range, { start: 100, end: 200 });

result = locatePdaProjection({ startTime: 100, endTime: 200 }, { chart: 'primary' });
assert.equal(result.secondary.located, false);
assert.equal(result.comparison.located, false);
assert.deepEqual(result.range, { start: 100, end: 200 });

console.log('pda-locate-actions-smoke passed');
