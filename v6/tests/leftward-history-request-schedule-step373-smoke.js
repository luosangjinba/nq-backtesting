import assert from 'node:assert/strict';
import { resolveLeftwardHistoryRequestSchedule } from '../src/chart-history/leftward-history-request-schedule.js';

const nativeTargetHistoryReducedDelay = resolveLeftwardHistoryRequestSchedule({
  nativeTargetHistoryDelayMs: 100,
  reason: 'native-visible-range',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: -2, to: 30 },
});
assert.deepEqual(nativeTargetHistoryReducedDelay, {
  delayMs: 100,
  mode: 'native-target-history-reduced-delay',
  reason: 'native-target-history-reduced-delay-with-coalescing',
  shouldDispatch: true,
});

const nativeTargetHistoryDefaultDelay = resolveLeftwardHistoryRequestSchedule({
  reason: 'native-visible-range',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: -2, to: 30 },
});
assert.deepEqual(nativeTargetHistoryDefaultDelay, {
  delayMs: 500,
  mode: 'delayed',
  reason: 'native-visible-range',
  shouldDispatch: true,
});

const lowTimeframeNativeDelay = resolveLeftwardHistoryRequestSchedule({
  nativeTargetHistoryDelayMs: 100,
  reason: 'native-visible-range',
  requestDelayMs: 500,
  targetHistoryEnabled: false,
  visibleRange: { from: -2, to: 30 },
});
assert.deepEqual(lowTimeframeNativeDelay, {
  delayMs: 500,
  mode: 'delayed',
  reason: 'native-visible-range',
  shouldDispatch: true,
});

const programmaticFastPath = resolveLeftwardHistoryRequestSchedule({
  nativeTargetHistoryDelayMs: 100,
  reason: 'runtime-display-timeframe-applied',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: -2, to: 30 },
});
assert.deepEqual(programmaticFastPath, {
  delayMs: 0,
  mode: 'programmatic-target-history-fast-path',
  reason: 'programmatic-target-history-runtime-event',
  shouldDispatch: true,
});

const invalidRange = resolveLeftwardHistoryRequestSchedule({
  nativeTargetHistoryDelayMs: 100,
  reason: 'native-visible-range',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: 0, to: 30 },
});
assert.deepEqual(invalidRange, {
  delayMs: null,
  mode: 'ignored',
  reason: 'visible-range-does-not-require-leftward-history',
  shouldDispatch: false,
});

const negativeNativeTargetHistoryDelay = resolveLeftwardHistoryRequestSchedule({
  nativeTargetHistoryDelayMs: -50,
  reason: 'native-visible-range',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: -2, to: 30 },
});
assert.deepEqual(negativeNativeTargetHistoryDelay, {
  delayMs: 0,
  mode: 'native-target-history-reduced-delay',
  reason: 'native-target-history-reduced-delay-with-coalescing',
  shouldDispatch: true,
});

console.log('v6 leftward history request schedule step373 smoke passed');
