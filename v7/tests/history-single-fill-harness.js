import assert from 'node:assert/strict';
import { planSingleHistoryFill } from '../src/replay-workspace-ui/history-fill-plan.js';
import { planSingleHistoryWindow } from '../src/replay-workspace-ui/history-window-plan.js';

const state = (barCount, from, to) => Object.freeze({
  barCount,
  logicalRange: Object.freeze({ from, to }),
});

assert.deepEqual(planSingleHistoryFill(state(5_000, 20, 1_020)), {
  displayBars: 240,
  logicalRange: { from: 20, to: 1_020 },
}, 'a shallow boundary keeps the established minimum history buffer');
assert.equal(planSingleHistoryFill(state(5_000, -300.2, 699.8)).displayBars, 333,
  'a dense negative range must request exactly enough bars to cross the buffered Canvas edge');
assert.equal(planSingleHistoryFill(state(5_000, -1_000, 0)).displayBars, 1_032,
  'the target must depend on missing left coverage rather than a fixed chunk or span multiplier');

for (const invalid of [
  null,
  state(0, 0, 1),
  state(1, 1, 1),
  state(1, Number.NaN, 1),
]) assert.throws(() => planSingleHistoryFill(invalid), TypeError);

const MINUTE = 60_000;
const end = 10_000 * MINUTE;
const allEligibleStart = planSingleHistoryWindow({
  durationMs: 4 * MINUTE,
  isEligibleMinute: () => true,
  maximumWindowMs: 10_000 * MINUTE,
  targetDisplayBars: 325,
  windowEndEpochMs: end,
});
assert.equal((end - allEligibleStart) / MINUTE, 1_300,
  'one 4m logical window must cover all 325 requested display buckets');

const sparseStart = planSingleHistoryWindow({
  durationMs: 4 * MINUTE,
  isEligibleMinute: (epochMs) => (epochMs / MINUTE) % 8 < 4,
  maximumWindowMs: 10_000 * MINUTE,
  targetDisplayBars: 325,
  windowEndEpochMs: end,
});
assert.ok(sparseStart < allEligibleStart,
  'Session-hours gaps must expand the same logical request before the chart transaction begins');

const cappedStart = planSingleHistoryWindow({
  durationMs: 4 * MINUTE,
  isEligibleMinute: () => false,
  maximumWindowMs: 1_000 * MINUTE,
  targetDisplayBars: 325,
  windowEndEpochMs: end,
});
assert.equal(cappedStart, end - (1_000 * MINUTE),
  'a source-empty history plan must stop at its single bounded logical window');

console.log('v7 single history fill harness passed (exact gap, session buckets, bounded stop)');
