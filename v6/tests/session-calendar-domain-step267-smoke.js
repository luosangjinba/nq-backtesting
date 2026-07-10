import assert from 'node:assert/strict';
import {
  getTradingDayKey,
  resolveTradingDayBucket,
  resolveTradingMonthBucket,
  resolveTradingWeekBucket,
} from '../src/session-calendar/session-calendar-domain.js';

function ts(value) {
  return Date.parse(value) / 1000;
}

assert.equal(getTradingDayKey('2026-05-31T18:00:00Z', { instrument: 'NQ' }), '2026-06-01');
assert.equal(getTradingDayKey('2026-06-01T17:59:00Z', { instrument: 'NQ' }), '2026-06-01');
assert.equal(getTradingDayKey('2026-06-01T18:00:00Z', { instrument: 'NQ' }), '2026-06-02');
assert.equal(getTradingDayKey(ts('2026-06-02T09:30:00Z'), { instrument: 'ES' }), '2026-06-02');

assert.deepEqual(resolveTradingDayBucket('2026-06-01T15:30:00Z', { instrument: 'NQ' }), {
  endTimestamp: ts('2026-06-01T17:59:59Z'),
  instrument: 'NQ',
  key: '2026-06-01',
  startTimestamp: ts('2026-05-31T18:00:00Z'),
  unit: 'day',
});

assert.deepEqual(resolveTradingDayBucket('2026-06-01T18:00:00Z', { instrument: 'NQ' }), {
  endTimestamp: ts('2026-06-02T17:59:59Z'),
  instrument: 'NQ',
  key: '2026-06-02',
  startTimestamp: ts('2026-06-01T18:00:00Z'),
  unit: 'day',
});

assert.deepEqual(resolveTradingWeekBucket('2026-06-03T12:00:00Z', { instrument: 'NQ' }), {
  endTimestamp: ts('2026-06-07T17:59:59Z'),
  instrument: 'NQ',
  key: '2026-06-01',
  startTimestamp: ts('2026-05-31T18:00:00Z'),
  unit: 'week',
});

assert.deepEqual(resolveTradingMonthBucket('2026-06-15T12:00:00Z', { instrument: 'ES' }), {
  endTimestamp: ts('2026-06-30T17:59:59Z'),
  instrument: 'ES',
  key: '2026-06',
  startTimestamp: ts('2026-05-31T18:00:00Z'),
  unit: 'month',
});

assert.deepEqual(resolveTradingMonthBucket('2026-06-30T18:00:00Z', { instrument: 'NQ' }), {
  endTimestamp: ts('2026-07-31T17:59:59Z'),
  instrument: 'NQ',
  key: '2026-07',
  startTimestamp: ts('2026-06-30T18:00:00Z'),
  unit: 'month',
});

assert.throws(
  () => getTradingDayKey('2026-06-01T12:00:00Z', { instrument: 'YM' }),
  /not supported/,
);
assert.throws(
  () => resolveTradingDayBucket('2026-06-01T12:00:00Z'),
  /not supported/,
);

console.log('v6 session calendar domain step267 smoke passed');
