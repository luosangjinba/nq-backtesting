import assert from 'node:assert/strict';
import { selectSessionAwareTargetHistorySizingSlice } from '../src/chart-history/target-history-request-sizing.js';

const selected = selectSessionAwareTargetHistorySizingSlice({
  backendSupported: ['8h', '1D'],
  enabled: ['1D', '1W', '1M'],
});
assert.deepEqual(selected, {
  reason: 'daily-target-history-backend-supported',
  targetTimeframe: '1D',
});

const unavailable = selectSessionAwareTargetHistorySizingSlice({
  backendSupported: ['8h'],
  enabled: ['1D', '1W', '1M'],
});
assert.deepEqual(unavailable, {
  reason: 'no-session-aware-target-history-backend-ready',
  targetTimeframe: null,
});

const disabled = selectSessionAwareTargetHistorySizingSlice({
  backendSupported: ['1D'],
  enabled: ['1W', '1M'],
});
assert.deepEqual(disabled, {
  reason: 'no-session-aware-target-history-backend-ready',
  targetTimeframe: null,
});

console.log('v6 target history session-aware sizing selection step297 smoke passed');
