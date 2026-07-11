import assert from 'node:assert/strict';
import {
  auditTargetHistoryRequestSizing,
  selectMonthlyTargetHistorySizingSlice,
  selectWeeklyTargetHistorySizingSlice,
} from '../src/chart-history/target-history-request-sizing.js';

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

const weekly = auditTargetHistoryRequestSizing({
  displayTimeframe: '1W',
  plannedWindow: {
    end: '2026-06-01 17:59',
    instrument: 'NQ',
    start: '2026-05-04 18:00',
    timeframe: 1,
  },
  sourceTimeframe: 1,
});
assert.equal(weekly.status, 'session-aware-policy-sized');
assert.equal(weekly.estimatedTargetBars, null);
assert.equal(weekly.targetDisplayBars, 4);
assert.equal(weekly.policy.prefetchSourceBars, 40000);

const monthly = auditTargetHistoryRequestSizing({
  displayTimeframe: '1M',
  plannedWindow: {
    end: '2026-06-01 17:59',
    instrument: 'NQ',
    start: '2026-05-01 18:00',
    timeframe: 1,
  },
  sourceTimeframe: 1,
});
assert.equal(monthly.status, 'session-aware-policy-sized');
assert.equal(monthly.estimatedTargetBars, null);
assert.equal(monthly.targetDisplayBars, 1);
assert.equal(monthly.policy.prefetchSourceBars, 40000);

const weeklySelected = selectWeeklyTargetHistorySizingSlice({
  backendSupported: ['8h', '1D', '1W'],
  dailyFallbackPacked: true,
  dailySuccessPacked: true,
  enabled: ['1D', '1W', '1M'],
});
assert.deepEqual(weeklySelected, {
  reason: 'weekly-target-history-backend-supported-after-daily-pack',
  targetTimeframe: '1W',
});

const weeklyAuditNeeded = selectWeeklyTargetHistorySizingSlice({
  backendSupported: ['8h', '1D'],
  dailyFallbackPacked: true,
  dailySuccessPacked: true,
  enabled: ['1D', '1W', '1M'],
});
assert.deepEqual(weeklyAuditNeeded, {
  reason: 'weekly-target-history-browser-sizing-audit-needed',
  targetTimeframe: '1W',
});

const weeklyBlocked = selectWeeklyTargetHistorySizingSlice({
  backendSupported: ['8h', '1D', '1W'],
  dailyFallbackPacked: false,
  dailySuccessPacked: true,
  enabled: ['1D', '1W', '1M'],
});
assert.deepEqual(weeklyBlocked, {
  reason: 'daily-target-history-pack-incomplete',
  targetTimeframe: null,
});

const monthlySelected = selectMonthlyTargetHistorySizingSlice({
  backendSupported: ['8h', '1D', '1W', '1M'],
  enabled: ['1D', '1W', '1M'],
  weeklyFallbackPacked: true,
  weeklySuccessPacked: true,
});
assert.deepEqual(monthlySelected, {
  reason: 'monthly-target-history-backend-supported-after-weekly-pack',
  targetTimeframe: '1M',
});

const monthlyAuditNeeded = selectMonthlyTargetHistorySizingSlice({
  backendSupported: ['8h', '1D', '1W'],
  enabled: ['1D', '1W', '1M'],
  weeklyFallbackPacked: true,
  weeklySuccessPacked: true,
});
assert.deepEqual(monthlyAuditNeeded, {
  reason: 'monthly-target-history-browser-sizing-audit-needed',
  targetTimeframe: '1M',
});

const monthlyBlocked = selectMonthlyTargetHistorySizingSlice({
  backendSupported: ['8h', '1D', '1W', '1M'],
  enabled: ['1D', '1W', '1M'],
  weeklyFallbackPacked: false,
  weeklySuccessPacked: true,
});
assert.deepEqual(monthlyBlocked, {
  reason: 'weekly-target-history-pack-incomplete',
  targetTimeframe: null,
});

assert.throws(() => auditTargetHistoryRequestSizing({
  displayTimeframe: 480,
  sourceTimeframe: 1,
}), /planned window/);

console.log('v6 target history request sizing step295 smoke passed');
