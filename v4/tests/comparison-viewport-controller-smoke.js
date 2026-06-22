import assert from 'node:assert/strict';
import { locateComparisonTimestampRange } from '../src/chart/comparison-viewport-controller.js';
import { locateChartRange, VIEWPORT_TARGETS } from '../src/chart/viewport-router.js';

assert.equal(locateComparisonTimestampRange(100, 200, { flash: false }), false);

const result = locateChartRange(VIEWPORT_TARGETS.COMPARISON, { start: 100, end: 200 }, { flash: false });
assert.equal(result.located, false);
assert.deepEqual(result.targets['comparison-window'], { located: false, reason: 'not-located' });

console.log('comparison-viewport-controller-smoke passed');
