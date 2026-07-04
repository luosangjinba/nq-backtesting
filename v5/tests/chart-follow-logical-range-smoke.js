import assert from 'node:assert/strict';
import { followLogicalRangeForBars } from '../src/runtime/chart-engine-range-projection.js';

function bars(count) {
  return Array.from({ length: count }, (_, index) => ({
    time: `2026-06-01T09:${String(30 + index).padStart(2, '0')}:00.000Z`,
    open: 100 + index,
    high: 101 + index,
    low: 99 + index,
    close: 100.5 + index,
  }));
}

const context = { rightOffsetBars: 10 };

const early = followLogicalRangeForBars(bars(3), context, { estimatedVisibleBars: 80 });
assert.deepEqual(early, { from: -67, to: 12 });

const afterNext = followLogicalRangeForBars(bars(4), context, { estimatedVisibleBars: 80 });
assert.deepEqual(afterNext, { from: -66, to: 13 });

assert.equal(
  early.to - (3 - 1),
  10,
  'latest bar should keep the configured right offset when the follow window is not full'
);
assert.equal(
  afterNext.to - (4 - 1),
  10,
  'new bars should push the logical window left rather than moving the latest bar toward the edge'
);
assert.equal(afterNext.to - afterNext.from, early.to - early.from);

const full = followLogicalRangeForBars(bars(90), context, { estimatedVisibleBars: 80 });
assert.deepEqual(full, { from: 20, to: 99 });

const legacy = followLogicalRangeForBars(bars(3), context);
assert.deepEqual(legacy, { from: 0, to: 12 });

console.log('v5 chart follow logical range smoke passed');
