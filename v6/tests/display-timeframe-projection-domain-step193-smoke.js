import assert from 'node:assert/strict';
import { projectSourceBarsToChartData } from '../src/chart-data-projection/chart-data-projection-domain.js';

const start = Date.parse('2026-05-31T18:00:00Z') / 1000;

function makeBar(index, override = {}) {
  return {
    close: 100 + index + 0.25,
    high: 101 + index,
    low: 99 + index,
    open: 100 + index,
    timestamp: start + (index * 60),
    ...override,
  };
}

const sourceBars = Array.from({ length: 65 }, (_, index) => makeBar(index));
const withDuplicate = [
  makeBar(1),
  makeBar(0),
  makeBar(0, {
    close: 150,
    high: 175,
    low: 80,
    open: 140,
  }),
];

const deduped = projectSourceBarsToChartData({
  bars: withDuplicate,
  sessionStartTimestamp: start,
  sourceTimeframe: 1,
  targetTimeframe: 1,
});

assert.deepEqual(deduped.bars, [
  {
    close: 150,
    high: 175,
    low: 80,
    open: 100,
    timestamp: start,
  },
  makeBar(1),
]);
assert.equal(deduped.buckets[0].complete, true);
assert.equal(deduped.buckets[0].sourceCount, 1);

const projected5m = projectSourceBarsToChartData({
  bars: sourceBars,
  sessionStartTimestamp: start,
  sourceTimeframe: 1,
  targetTimeframe: 5,
});

assert.deepEqual(projected5m.bars.slice(0, 2), [
  {
    close: 104.25,
    high: 105,
    low: 99,
    open: 100,
    timestamp: start,
  },
  {
    close: 109.25,
    high: 110,
    low: 104,
    open: 105,
    timestamp: start + 300,
  },
]);
assert.equal(projected5m.buckets[0].bucketStartTimestamp, start);
assert.equal(projected5m.buckets[0].bucketEndTimestamp, start + 240);
assert.equal(projected5m.buckets[0].complete, true);
assert.equal(projected5m.buckets[0].inProgress, false);
assert.equal(projected5m.buckets[0].expectedSourceBars, 5);
assert.equal(projected5m.buckets[0].sourceCount, 5);

const cursorProjected = projectSourceBarsToChartData({
  bars: sourceBars,
  cursorTimestamp: start + (7 * 60),
  sessionStartTimestamp: start,
  sourceTimeframe: 1,
  targetTimeframe: 5,
});

assert.deepEqual(cursorProjected.bars, [
  projected5m.bars[0],
  {
    close: 107.25,
    high: 108,
    low: 104,
    open: 105,
    timestamp: start + 300,
  },
]);
assert.equal(cursorProjected.buckets[0].complete, true);
assert.equal(cursorProjected.buckets[1].complete, false);
assert.equal(cursorProjected.buckets[1].cursorCapped, true);
assert.equal(cursorProjected.buckets[1].inProgress, true);
assert.equal(cursorProjected.buckets[1].sourceCount, 3);

const projected15m = projectSourceBarsToChartData({
  bars: sourceBars,
  sessionStartTimestamp: start,
  sourceTimeframe: 1,
  targetTimeframe: 15,
});
assert.equal(projected15m.bars[0].timestamp, start);
assert.equal(projected15m.bars[1].timestamp, start + 900);
assert.equal(projected15m.buckets[0].expectedSourceBars, 15);
assert.equal(projected15m.buckets[0].complete, true);

const projected60m = projectSourceBarsToChartData({
  bars: sourceBars,
  sessionStartTimestamp: start,
  sourceTimeframe: 1,
  targetTimeframe: 60,
});
assert.deepEqual(projected60m.bars.slice(0, 2), [
  {
    close: 159.25,
    high: 160,
    low: 99,
    open: 100,
    timestamp: start,
  },
  {
    close: 164.25,
    high: 165,
    low: 159,
    open: 160,
    timestamp: start + 3600,
  },
]);
assert.equal(new Date(projected60m.bars[0].timestamp * 1000).toISOString(), '2026-05-31T18:00:00.000Z');
assert.equal(projected60m.buckets[0].complete, true);
assert.equal(projected60m.buckets[1].complete, false);
assert.equal(projected60m.buckets[1].inProgress, true);

assert.throws(
  () => projectSourceBarsToChartData({
    bars: sourceBars,
    sourceTimeframe: 5,
    targetTimeframe: 1,
  }),
  /multiple/,
);

console.log('v6 display timeframe projection domain step 193 smoke passed');
