import assert from 'node:assert/strict';
import {
  TIME_AXIS_SCAFFOLD_SERIES_OPTIONS,
  assertTimeAxisScaffoldSeriesData,
  normalizeTimeAxisScaffoldSeriesData,
} from '../src/chart-engine/time-axis-scaffold-series-contract.js';

assert.deepEqual(TIME_AXIS_SCAFFOLD_SERIES_OPTIONS, {
  crosshairMarkerVisible: false,
  lastValueVisible: false,
  lineVisible: false,
  priceLineVisible: false,
});
assert.equal(Object.isFrozen(TIME_AXIS_SCAFFOLD_SERIES_OPTIONS), true);

const points = normalizeTimeAxisScaffoldSeriesData([
  { timestamp: 100 },
  { time: 200 },
]);
assert.deepEqual(points, [{ time: 100 }, { time: 200 }]);
assert.equal(points.every(Object.isFrozen), true);
assert.equal(assertTimeAxisScaffoldSeriesData(points), true);

assert.throws(
  () => normalizeTimeAxisScaffoldSeriesData([{ time: 'invalid' }]),
  /finite time/,
);
assert.throws(
  () => assertTimeAxisScaffoldSeriesData([{ time: 100, value: 1 }]),
  /time-only whitespace/,
);
assert.throws(
  () => assertTimeAxisScaffoldSeriesData([{ open: 1, time: 100 }]),
  /time-only whitespace/,
);

console.log('v6 time axis scaffold series contract smoke passed');
