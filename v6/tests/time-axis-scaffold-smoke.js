import assert from 'node:assert/strict';
import {
  DEFAULT_TIME_AXIS_SCAFFOLD_POINT_COUNT,
  createTimeAxisScaffold,
} from '../src/chart-engine/time-axis-scaffold.js';

const bars = [{ timestamp: 1_780_306_200, open: 1, high: 2, low: 0, close: 1.5 }];

assert.deepEqual(createTimeAxisScaffold({ bars: [] }), []);
assert.deepEqual(createTimeAxisScaffold({ bars, count: 0 }), []);
assert.equal(createTimeAxisScaffold({ bars }).length, DEFAULT_TIME_AXIS_SCAFFOLD_POINT_COUNT);
assert.deepEqual(createTimeAxisScaffold({ bars, count: 3, timeframe: 1 }), [
  { time: 1_780_306_260 },
  { time: 1_780_306_320 },
  { time: 1_780_306_380 },
]);
assert.deepEqual(createTimeAxisScaffold({ bars, count: 2, timeframe: '4h' }), [
  { time: 1_780_320_600 },
  { time: 1_780_335_000 },
]);
assert.deepEqual(createTimeAxisScaffold({ bars, count: 2, timeframe: '1D' }), [
  { time: 1_780_392_600 },
  { time: 1_780_479_000 },
]);
assert.deepEqual(createTimeAxisScaffold({ bars, count: 2, timeframe: '1W' }), [
  { time: 1_780_911_000 },
  { time: 1_781_515_800 },
]);

const january = [{ timestamp: Date.UTC(2026, 0, 1, 18) / 1000 }];
assert.deepEqual(createTimeAxisScaffold({ bars: january, count: 2, timeframe: '1M' }), [
  { time: Date.UTC(2026, 1, 1, 18) / 1000 },
  { time: Date.UTC(2026, 2, 1, 18) / 1000 },
]);

assert.throws(
  () => createTimeAxisScaffold({ bars, timeframe: '7h' }),
  /timeAxisTimeframe/,
);

console.log('v6 time axis scaffold smoke passed');
