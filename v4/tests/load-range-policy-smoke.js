import assert from 'node:assert/strict';
import {
  estimateRequestedBars,
  getMaxEstimatedBars,
  getVirtualLoadWindowDays,
  resolveChartLoadRange,
  validateSingleWindowRange,
} from '../src/data/load-range-policy.js';

assert.equal(estimateRequestedBars('2024-01-01 00:00', '2024-01-02 00:00', 1), 1479);
assert.equal(getMaxEstimatedBars(1), 64839);
assert.equal(getVirtualLoadWindowDays(1), 14);
assert.equal(getVirtualLoadWindowDays(60), 730);
assert.equal(getMaxEstimatedBars(2), 32439);
assert.equal(getMaxEstimatedBars(3), 21639);
assert.equal(getMaxEstimatedBars(4), 16239);
assert.equal(getMaxEstimatedBars(10), 25959);

const normalOneMinute = validateSingleWindowRange('2024-01-01 00:00', '2024-01-15 00:00', 1);
assert.equal(normalOneMinute.ok, true);

const virtualOneMinute = resolveChartLoadRange('2024-01-01 00:00', '2024-01-31 00:00', 1);
assert.equal(virtualOneMinute.ok, true);
assert.equal(virtualOneMinute.windowed, true);
assert.equal(virtualOneMinute.outerRange.start, '2024-01-01 00:00');
assert.equal(virtualOneMinute.start, '2024-01-01 00:00');
assert.equal(virtualOneMinute.end, '2024-01-15 00:00');

const oversizedOneMinute = validateSingleWindowRange('2024-01-01 00:00', '2024-04-01 00:00', 1);
assert.equal(oversizedOneMinute.ok, false);
assert.match(oversizedOneMinute.message, /1m/);
assert.ok(oversizedOneMinute.estimatedBars > oversizedOneMinute.maxEstimatedBars);

const windowed = resolveChartLoadRange('2024-01-01 00:00', '2024-04-01 00:00', 1);
assert.equal(windowed.ok, true);
assert.equal(windowed.windowed, true);
assert.equal(windowed.outerRange.start, '2024-01-01 00:00');
assert.equal(windowed.start, '2024-01-01 00:00');
assert.equal(windowed.end, '2024-01-15 00:00');

const normalHourly = validateSingleWindowRange('2024-01-01 00:00', '2024-12-31 00:00', 60);
assert.equal(normalHourly.ok, true);

const normalFifteenMinuteYear = validateSingleWindowRange('2024-01-01 00:00', '2024-12-31 00:00', 15);
assert.equal(normalFifteenMinuteYear.ok, true);

const normalTenMinuteHalfYear = validateSingleWindowRange('2024-01-01 00:00', '2024-06-15 00:00', 10);
assert.equal(normalTenMinuteHalfYear.ok, true);

const oversizedTwoMinute = validateSingleWindowRange('2024-01-01 00:00', '2024-03-01 00:00', 2);
assert.equal(oversizedTwoMinute.ok, false);
assert.match(oversizedTwoMinute.message, /2m/);

console.log('load range policy smoke passed');
