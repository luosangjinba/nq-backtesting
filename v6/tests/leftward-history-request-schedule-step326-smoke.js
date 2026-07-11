import assert from 'node:assert/strict';
import { resolveLeftwardHistoryRequestSchedule } from '../src/chart-history/leftward-history-request-schedule.js';

const native = resolveLeftwardHistoryRequestSchedule({
  reason: 'native-visible-range',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: -2, to: 30 },
});
assert.deepEqual(native, {
  delayMs: 500,
  mode: 'delayed',
  reason: 'native-visible-range',
  shouldDispatch: true,
});

const displayApply = resolveLeftwardHistoryRequestSchedule({
  reason: 'runtime-display-timeframe-applied',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: -2, to: 30 },
});
assert.deepEqual(displayApply, {
  delayMs: 0,
  mode: 'programmatic-target-history-fast-path',
  reason: 'programmatic-target-history-runtime-event',
  shouldDispatch: true,
});

const viewportProjection = resolveLeftwardHistoryRequestSchedule({
  reason: 'runtime-viewport-projected',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: -2, to: 30 },
});
assert.equal(viewportProjection.delayMs, 0);
assert.equal(viewportProjection.mode, 'programmatic-target-history-fast-path');

const targetHistoryDisabled = resolveLeftwardHistoryRequestSchedule({
  reason: 'runtime-display-timeframe-applied',
  requestDelayMs: 500,
  targetHistoryEnabled: false,
  visibleRange: { from: -2, to: 30 },
});
assert.equal(targetHistoryDisabled.delayMs, 500);
assert.equal(targetHistoryDisabled.mode, 'delayed');

const paneReload = resolveLeftwardHistoryRequestSchedule({
  reason: 'runtime-pane-reload-viewport-projected',
  requestDelayMs: 500,
  targetHistoryEnabled: true,
  visibleRange: { from: -2, to: 30 },
});
assert.equal(paneReload.delayMs, 500);
assert.equal(paneReload.mode, 'delayed');

const invalidRange = resolveLeftwardHistoryRequestSchedule({
  reason: 'runtime-display-timeframe-applied',
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

console.log('v6 leftward history request schedule step326 smoke passed');
