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

console.log('v6 target display materialization shared domain smoke passed');
