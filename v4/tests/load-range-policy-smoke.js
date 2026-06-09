import assert from 'node:assert/strict';
import {
  estimateRequestedBars,
  getMaxEstimatedBars,
  resolveChartLoadRange,
  validateSingleWindowRange,
} from '../src/data/load-range-policy.js';

assert.equal(estimateRequestedBars('2024-01-01 00:00', '2024-01-02 00:00', 1), 1479);
assert.equal(getMaxEstimatedBars(1), 64839);

const normalOneMinute = validateSingleWindowRange('2024-01-01 00:00', '2024-01-15 00:00', 1);
assert.equal(normalOneMinute.ok, true);

const oversizedOneMinute = validateSingleWindowRange('2024-01-01 00:00', '2024-04-01 00:00', 1);
assert.equal(oversizedOneMinute.ok, false);
assert.match(oversizedOneMinute.message, /1m/);
assert.ok(oversizedOneMinute.estimatedBars > oversizedOneMinute.maxEstimatedBars);

const windowed = resolveChartLoadRange('2024-01-01 00:00', '2024-04-01 00:00', 1);
assert.equal(windowed.ok, true);
assert.equal(windowed.windowed, true);
assert.equal(windowed.outerRange.start, '2024-01-01 00:00');
assert.equal(windowed.start, '2024-01-01 00:00');
assert.equal(windowed.end, '2024-02-15 00:00');

const normalHourly = validateSingleWindowRange('2024-01-01 00:00', '2024-12-31 00:00', 60);
assert.equal(normalHourly.ok, true);

const normalFifteenMinuteYear = validateSingleWindowRange('2024-01-01 00:00', '2024-12-31 00:00', 15);
assert.equal(normalFifteenMinuteYear.ok, true);

console.log('load range policy smoke passed');
