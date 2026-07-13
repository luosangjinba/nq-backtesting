import assert from 'node:assert/strict';
import { projectSourceBarsToChartData } from '../src/chart-data-projection/chart-data-projection-domain.js';
import { targetTimeframeToAlignmentOffsetSeconds } from '../src/time-domain/target-timeframe-domain.js';

const start = Date.parse('2026-06-01T00:00:00Z') / 1000;
const sourceBars = Array.from({ length: 720 }, (_, index) => ({
  close: index + 0.75,
  high: index + 1,
  low: index - 1,
  open: index + 0.25,
  timestamp: start + (index * 60),
}));

for (const targetTimeframe of [2, 3, 4, 10, 30, 60, 120, 240, 480, 720]) {
  const projection = projectSourceBarsToChartData({
    bars: sourceBars,
    sessionStartTimestamp: start,
    sourceTimeframe: 1,
    targetTimeframe,
  });
  const targetSeconds = targetTimeframe * 60;
  const alignmentOffset = targetTimeframeToAlignmentOffsetSeconds(targetTimeframe);
  const firstBucketTimestamp = alignmentOffset
    + Math.floor((start - alignmentOffset) / targetSeconds) * targetSeconds;
  const lastSourceTimestamp = start + (719 * 60);
  const expectedBucketCount = Math.floor((lastSourceTimestamp - firstBucketTimestamp) / targetSeconds) + 1;
  const firstBucketSourceCount = Math.min(
    720,
    Math.floor((firstBucketTimestamp + targetSeconds - start) / 60),
  );
  assert.equal(projection.sourceTimeframe, 1, `${targetTimeframe}m should keep 1m source`);
  assert.equal(projection.targetTimeframe, targetTimeframe, `${targetTimeframe}m target should round trip`);
  assert.equal(projection.bars.length, expectedBucketCount, `${targetTimeframe}m should bucket the full source set`);
  assert.equal(projection.buckets.length, expectedBucketCount, `${targetTimeframe}m should expose bucket metadata`);
  assert.equal(projection.bars[0].timestamp, firstBucketTimestamp, `${targetTimeframe}m first bucket should use canonical alignment`);
  assert.deepEqual(projection.bars[0], {
    close: firstBucketSourceCount - 1 + 0.75,
    high: firstBucketSourceCount,
    low: -1,
    open: 0.25,
    timestamp: firstBucketTimestamp,
  });
  assert.equal(projection.buckets[0].bucketEndTimestamp, firstBucketTimestamp + ((targetTimeframe - 1) * 60));
  assert.equal(projection.buckets[0].complete, firstBucketSourceCount === targetTimeframe);
  assert.equal(projection.buckets[0].expectedSourceBars, targetTimeframe);
  assert.equal(projection.buckets[0].sourceCount, firstBucketSourceCount);
}

const cursorProjected = projectSourceBarsToChartData({
  bars: sourceBars,
  cursorTimestamp: start + (125 * 60),
  sessionStartTimestamp: start,
  sourceTimeframe: 1,
  targetTimeframe: 120,
});
assert.equal(cursorProjected.bars.length, 2);
assert.equal(cursorProjected.buckets[0].complete, true);
assert.equal(cursorProjected.buckets[1].complete, false);
assert.equal(cursorProjected.buckets[1].cursorCapped, true);
assert.equal(cursorProjected.buckets[1].sourceCount, 6);

console.log('v6 minute hour timeframe projection step265 smoke passed');
