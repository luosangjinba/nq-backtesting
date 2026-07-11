import assert from 'node:assert/strict';
import { auditTargetHistoryRequestSizing } from '../src/chart-history/target-history-request-sizing.js';

const eightHour = auditTargetHistoryRequestSizing({
  displayTimeframe: 480,
  plannedWindow: {
    end: '2026-06-01 17:59',
    instrument: 'NQ',
    start: '2026-05-26 02:00',
    timeframe: 1,
  },
  sourceTimeframe: 1,
});
assert.equal(eightHour.status, 'adequate');
assert.equal(eightHour.estimatedTargetBars, 20);
assert.equal(eightHour.targetDisplayBars, 20);
assert.equal(eightHour.difference, 0);
assert.equal(eightHour.policy.prefetchSourceBars, 9600);

const fourHour = auditTargetHistoryRequestSizing({
  displayTimeframe: 240,
  plannedWindow: {
    end: '2026-06-01 17:59',
    instrument: 'NQ',
    start: '2026-05-29 13:59',
    timeframe: 1,
  },
  sourceTimeframe: 1,
});
assert.equal(fourHour.status, 'adequate');
assert.equal(fourHour.estimatedTargetBars, 20);
assert.equal(fourHour.targetDisplayBars, 20);

const underfilled = auditTargetHistoryRequestSizing({
  displayTimeframe: 480,
  plannedWindow: {
    end: '2026-06-01 17:59',
    instrument: 'NQ',
    start: '2026-05-31 18:00',
    timeframe: 1,
  },
  sourceTimeframe: 1,
});
assert.equal(underfilled.status, 'underfilled');
assert.equal(underfilled.estimatedTargetBars, 3);
assert.equal(underfilled.targetDisplayBars, 20);
assert.equal(underfilled.difference, -17);

const daily = auditTargetHistoryRequestSizing({
  displayTimeframe: '1D',
  plannedWindow: {
    end: '2026-06-01 17:59',
    instrument: 'NQ',
    start: '2026-05-20 18:00',
    timeframe: 1,
  },
  sourceTimeframe: 1,
});
assert.equal(daily.status, 'session-aware-policy-sized');
assert.equal(daily.estimatedTargetBars, null);
assert.equal(daily.targetDisplayBars, 12);
assert.equal(daily.policy.prefetchSourceBars, 17280);

assert.throws(() => auditTargetHistoryRequestSizing({
  displayTimeframe: 480,
  sourceTimeframe: 1,
}), /planned window/);

console.log('v6 target history request sizing step295 smoke passed');
