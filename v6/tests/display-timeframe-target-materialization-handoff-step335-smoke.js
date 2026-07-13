import assert from 'node:assert/strict';
import {
  buildTargetBarRevealInput,
  inferTargetBarBucketEndTimestamp,
  resolveDisplayTimeframeTargetMaterializationHandoff,
  sourceCursorTimestampFromState,
} from '../src/display-timeframe/display-timeframe-target-materialization-handoff.js';

const t = (iso) => Math.floor(Date.parse(iso) / 1000);

assert.equal(
  sourceCursorTimestampFromState({ cursorTime: '2026-06-01T18:02:00.000Z' }),
  t('2026-06-01T18:02:00.000Z'),
);
assert.equal(
  sourceCursorTimestampFromState({ cursorTimestamp: t('2026-06-01T18:03:00.000Z') }),
  t('2026-06-01T18:03:00.000Z'),
);
assert.equal(sourceCursorTimestampFromState({}), null);

assert.equal(
  inferTargetBarBucketEndTimestamp({
    bar: { timestamp: t('2026-06-01T18:00:00.000Z') },
    sourceTimeframe: 1,
    targetTimeframe: '5m',
  }),
  t('2026-06-01T18:04:00.000Z'),
);
assert.equal(
  inferTargetBarBucketEndTimestamp({
    bar: {
      bucketEndTimestamp: t('2026-06-01T23:59:00.000Z'),
      timestamp: t('2026-06-01T18:00:00.000Z'),
    },
    sourceTimeframe: 1,
    targetTimeframe: '1D',
  }),
  t('2026-06-01T23:59:00.000Z'),
);
assert.equal(
  inferTargetBarBucketEndTimestamp({
    bar: { timestamp: t('2026-06-01T18:00:00.000Z') },
    sourceTimeframe: 1,
    targetTimeframe: '1D',
  }),
  t('2026-06-01T18:00:00.000Z'),
);

assert.deepEqual(
  buildTargetBarRevealInput({
    bar: {
      close: 101,
      high: 102,
      low: 99,
      open: 100,
      timestamp: t('2026-06-01T18:00:00.000Z'),
    },
    sourceTimeframe: 1,
    targetTimeframe: '5m',
  }),
  {
    bucketEndTimestamp: t('2026-06-01T18:04:00.000Z'),
    bucketStartTimestamp: t('2026-06-01T18:00:00.000Z'),
    close: 101,
    high: 102,
    low: 99,
    open: 100,
    timestamp: t('2026-06-01T18:00:00.000Z'),
  },
);

const handoff = resolveDisplayTimeframeTargetMaterializationHandoff({
  sourceCursorTimestamp: t('2026-06-01T18:02:00.000Z'),
  sourceTimeframe: 1,
  targetBars: [
    {
      bucketEndTimestamp: t('2026-06-01T18:02:00.000Z'),
      bucketStartTimestamp: t('2026-06-01T18:00:00.000Z'),
      close: 101,
      high: 102,
      low: 99,
      open: 100,
      timestamp: t('2026-06-01T18:00:00.000Z'),
    },
    {
      close: 106,
      high: 107,
      low: 104,
      open: 105,
      timestamp: t('2026-06-01T18:05:00.000Z'),
    },
  ],
  targetTimeframe: '5m',
});
assert.equal(handoff.status, 'applied');
assert.equal(handoff.cursorTimestamp, t('2026-06-01T18:02:00.000Z'));
assert.deepEqual(handoff.bars.map((bar) => bar.timestamp), [
  t('2026-06-01T18:00:00.000Z'),
]);
assert.deepEqual(handoff.revealStates.map((state) => state.reason), [
  'target-bar-complete-before-or-at-source-cursor',
  'target-bar-start-after-source-cursor',
]);

const noCursor = resolveDisplayTimeframeTargetMaterializationHandoff({
  sourceCursorTimestamp: null,
  targetBars: [
    {
      close: 101,
      high: 102,
      low: 99,
      open: 100,
      timestamp: t('2026-06-01T18:00:00.000Z'),
    },
  ],
  targetTimeframe: '5m',
});
assert.equal(noCursor.status, 'fallback');
assert.equal(noCursor.fallbackReason, 'source-replay-cursor-unavailable');
assert.deepEqual(noCursor.bars, []);

const noVisible = resolveDisplayTimeframeTargetMaterializationHandoff({
  sourceCursorTimestamp: t('2026-06-01T17:59:00.000Z'),
  targetBars: [
    {
      close: 101,
      high: 102,
      low: 99,
      open: 100,
      timestamp: t('2026-06-01T18:00:00.000Z'),
    },
  ],
  targetTimeframe: '5m',
});
assert.equal(noVisible.status, 'fallback');
assert.equal(noVisible.fallbackReason, 'target-history-no-visible-bars');
assert.deepEqual(noVisible.revealStates.map((state) => state.visible), [false]);

console.log('v6 display timeframe target materialization handoff step335 smoke passed');
