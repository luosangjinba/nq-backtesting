import assert from 'node:assert/strict';
import { projectSourceBarsToChartData } from '../src/chart-data-projection/chart-data-projection-domain.js';

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
  const expectedBucketCount = Math.ceil(720 / targetTimeframe);
  assert.equal(projection.sourceTimeframe, 1, `${targetTimeframe}m should keep 1m source`);
  assert.equal(projection.targetTimeframe, targetTimeframe, `${targetTimeframe}m target should round trip`);
  assert.equal(projection.bars.length, expectedBucketCount, `${targetTimeframe}m should bucket the full source set`);
  assert.equal(projection.buckets.length, expectedBucketCount, `${targetTimeframe}m should expose bucket metadata`);
  assert.equal(projection.bars[0].timestamp, start, `${targetTimeframe}m first bucket should use session origin`);
  assert.deepEqual(projection.bars[0], {
    close: targetTimeframe - 1 + 0.75,
    high: targetTimeframe,
    low: -1,
    open: 0.25,
    timestamp: start,
  });
  assert.equal(projection.buckets[0].bucketEndTimestamp, start + ((targetTimeframe - 1) * 60));
  assert.equal(projection.buckets[0].complete, true);
  assert.equal(projection.buckets[0].expectedSourceBars, targetTimeframe);
  assert.equal(projection.buckets[0].sourceCount, targetTimeframe);
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
