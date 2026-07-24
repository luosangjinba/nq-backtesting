import assert from 'node:assert/strict';
import {
  intersectMarketDates,
  marketDateId,
  sharedMarketTimeBounds,
} from '../src/session-browser-ui/market-date-policy.js';

const availability = Object.freeze({
  'instrument.cme.nq': Object.freeze({
    dates: Object.freeze(['2026-07-20', '2026-07-21', '2026-07-22']),
    firstTimestamp: '2026-07-20T09:31',
    latestTimestamp: '2026-07-22T06:59',
  }),
  'instrument.cme.es': Object.freeze({
    dates: Object.freeze(['2026-07-20', '2026-07-22']),
    firstTimestamp: '2026-07-20T09:30',
    latestTimestamp: '2026-07-22T07:00',
  }),
});

assert.deepEqual(intersectMarketDates(availability, ['instrument.cme.nq']), [
  '2026-07-20', '2026-07-21', '2026-07-22',
]);
assert.deepEqual(intersectMarketDates(availability, [
  'instrument.cme.nq', 'instrument.cme.es',
]), ['2026-07-20', '2026-07-22'], 'multi-instrument Sessions must use date intersection');
assert.deepEqual(sharedMarketTimeBounds(availability, [
  'instrument.cme.nq', 'instrument.cme.es',
]), {
  firstTimestamp: '2026-07-20T09:31',
  latestTimestamp: '2026-07-22T06:59',
}, 'shared edge-time bounds must exclude time without data in any selected instrument');
assert.equal(marketDateId({ year: 2026, month: 6, day: 2 }), '2026-07-02');
assert.deepEqual(intersectMarketDates(availability, []), []);
assert.throws(
  () => intersectMarketDates(availability, ['instrument.cme.missing']),
  /availability is incomplete/,
);

console.log('v7 Session market-date policy harness passed');
