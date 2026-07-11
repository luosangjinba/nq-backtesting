import assert from 'node:assert/strict';
import { selectTargetHistoryPhaseDSlice } from '../src/chart-history/target-history-phase-d-selection.js';

const selected = selectTargetHistoryPhaseDSlice({
  dailySuccessPacked: true,
  fixedSuccessFallbackPacked: true,
});
assert.deepEqual(selected, {
  reason: 'daily-success-packed-fallback-gap-remains',
  slice: 'daily-fallback-browser-coverage',
});

const weeklyFallback = selectTargetHistoryPhaseDSlice({
  candidates: [
    'daily-fallback-browser-coverage',
    'weekly-request-sizing-selection',
    'display-history-responsiveness-audit',
  ],
  dailySuccessPacked: false,
  fixedSuccessFallbackPacked: true,
});
assert.deepEqual(weeklyFallback, {
  reason: 'session-aware-weekly-sizing-next-candidate',
  slice: 'weekly-request-sizing-selection',
});

const responsivenessFallback = selectTargetHistoryPhaseDSlice({
  candidates: [
    'display-history-responsiveness-audit',
  ],
  dailySuccessPacked: false,
  fixedSuccessFallbackPacked: false,
});
assert.deepEqual(responsivenessFallback, {
  reason: 'target-history-pack-ready-for-responsiveness-audit',
  slice: 'display-history-responsiveness-audit',
});

const none = selectTargetHistoryPhaseDSlice({
  candidates: [],
  dailySuccessPacked: true,
  fixedSuccessFallbackPacked: true,
});
assert.deepEqual(none, {
  reason: 'no-target-history-phase-d-candidate',
  slice: null,
});

console.log('v6 target history phase d selection step300 smoke passed');
