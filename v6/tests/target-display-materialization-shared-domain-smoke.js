import assert from 'node:assert/strict';
import { resolveTargetDisplayMaterialization } from '../src/materialization/target-display-materialization.js';
import { resolveDisplayTimeframeTargetMaterializationHandoff } from '../src/display-timeframe/display-timeframe-target-materialization-handoff.js';

const input = {
  sourceTimeframe: 1,
  targetBars: [{ close: 101, timestamp: 0 }],
  targetTimeframe: '8h',
};

const beforeClose = resolveTargetDisplayMaterialization({
  ...input,
  sourceCursorTimestamp: 28700,
});
assert.equal(beforeClose.status, 'fallback');
assert.equal(beforeClose.bars.length, 0);

const atClose = resolveTargetDisplayMaterialization({
  ...input,
  sourceCursorTimestamp: 28740,
});
assert.equal(atClose.status, 'applied');
assert.equal(atClose.bars.length, 1);

assert.deepEqual(
  resolveDisplayTimeframeTargetMaterializationHandoff({
    ...input,
    sourceCursorTimestamp: 28740,
  }),
  atClose,
);

const mixedWindow = resolveTargetDisplayMaterialization({
  sourceCursorTimestamp: 350,
  sourceTimeframe: 1,
  targetBars: [
    { bucketEndTimestamp: 300, bucketStartTimestamp: 100, close: 100, timestamp: 100 },
    { bucketEndTimestamp: 500, bucketStartTimestamp: 300, close: 999, timestamp: 300 },
  ],
  targetTimeframe: '5m',
});
assert.equal(mixedWindow.status, 'fallback');
assert.equal(mixedWindow.fallbackReason, 'target-history-in-progress-source-projection');
assert.deepEqual(mixedWindow.bars, []);

const staleWindow = resolveTargetDisplayMaterialization({
  sourceCursorTimestamp: 600,
  sourceTimeframe: 1,
  targetBars: [{ bucketEndTimestamp: 500, bucketStartTimestamp: 300, close: 100, timestamp: 300 }],
  targetTimeframe: '5m',
});
assert.equal(staleWindow.status, 'fallback');
assert.equal(staleWindow.fallbackReason, 'target-history-stale-source-projection');
assert.deepEqual(staleWindow.bars, []);

console.log('v6 target display materialization shared domain smoke passed');
