import assert from 'node:assert/strict';
import {
  compactUtcTime,
  dateKeyFromBar,
  dateKeyFromInput,
  dateKeyFromTimestamp,
  dateKeyFromTradingDay,
  dateKeyFromUtcParts,
} from '../src/utils.js';

const timestamp = Date.UTC(2024, 0, 10, 9, 30, 0) / 1000;
const lateTimestamp = Date.UTC(2024, 0, 10, 23, 59, 0) / 1000;
const nextDayTimestamp = Date.UTC(2024, 0, 11, 0, 0, 0) / 1000;

assert.equal(dateKeyFromTimestamp(timestamp), '2024-01-10');
assert.equal(dateKeyFromTimestamp(lateTimestamp), '2024-01-10');
assert.equal(dateKeyFromTimestamp(nextDayTimestamp), '2024-01-11');
assert.equal(dateKeyFromTimestamp(0), '');
assert.equal(dateKeyFromTimestamp(-1), '');
assert.equal(dateKeyFromTimestamp('bad'), '');

assert.equal(dateKeyFromTradingDay('2024-01-10'), '2024-01-10');
assert.equal(dateKeyFromTradingDay('2024-01-10 09:30'), '2024-01-10');
assert.equal(dateKeyFromTradingDay(''), '');
assert.equal(dateKeyFromInput('2024-01-12 00:00'), '2024-01-12');

assert.equal(dateKeyFromBar({ tradingDay: '2024-01-13', timestamp }), '2024-01-13');
assert.equal(dateKeyFromBar({ trading_day: '2024-01-14', timestamp }), '2024-01-14');
assert.equal(dateKeyFromBar({ timestamp }), '2024-01-10');

assert.equal(dateKeyFromUtcParts(2024, 0, 5), '2024-01-05');
assert.equal(compactUtcTime(timestamp), '09:30');
assert.equal(compactUtcTime(null, '--:--'), '--:--');

console.log('date key smoke passed');
