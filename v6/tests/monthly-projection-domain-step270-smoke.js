import assert from 'node:assert/strict';
import { projectSourceBarsToChartData } from '../src/chart-data-projection/chart-data-projection-domain.js';

function ts(value) {
  return Date.parse(value) / 1000;
}

function bar(timestamp, index) {
  return {
    close: index + 0.75,
    high: index + 1,
    low: index - 1,
    open: index + 0.25,
    timestamp,
  };
}

const sourceBars = [
  bar(ts('2026-05-31T18:00:00Z'), 0),
  bar(ts('2026-06-01T17:59:00Z'), 1),
  bar(ts('2026-06-30T17:59:00Z'), 2),
  bar(ts('2026-06-30T18:00:00Z'), 3),
  bar(ts('2026-07-31T17:59:00Z'), 4),
];

const projection = projectSourceBarsToChartData({
  bars: sourceBars,
  instrument: 'NQ',
  sourceTimeframe: 1,
  targetTimeframe: '1M',
});

assert.equal(projection.sourceTimeframe, 1);
assert.equal(projection.targetTimeframe, '1M');
assert.deepEqual(projection.bars, [
  {
    close: 2.75,
    high: 3,
    low: -1,
    open: 0.25,
    timestamp: ts('2026-05-31T18:00:00Z'),
  },
  {
    close: 4.75,
    high: 5,
    low: 2,
    open: 3.25,
    timestamp: ts('2026-06-30T18:00:00Z'),
  },
]);
assert.deepEqual(projection.buckets.map((bucket) => ({
  complete: bucket.complete,
  cursorCapped: bucket.cursorCapped,
  end: bucket.bucketEndTimestamp,
  key: bucket.key,
  sourceCount: bucket.sourceCount,
  start: bucket.bucketStartTimestamp,
  unit: bucket.unit,
})), [
  {
    complete: true,
    cursorCapped: false,
    end: ts('2026-06-30T17:59:59Z'),
    key: '2026-06',
    sourceCount: 3,
    start: ts('2026-05-31T18:00:00Z'),
    unit: 'month',
  },
  {
    complete: true,
    cursorCapped: false,
    end: ts('2026-07-31T17:59:59Z'),
    key: '2026-07',
    sourceCount: 2,
    start: ts('2026-06-30T18:00:00Z'),
    unit: 'month',
  },
]);

const cursorProjection = projectSourceBarsToChartData({
  bars: sourceBars,
  cursorTimestamp: ts('2026-06-30T18:00:00Z'),
  instrument: 'NQ',
  sourceTimeframe: 1,
  targetTimeframe: '1M',
});
assert.equal(cursorProjection.bars.length, 2);
assert.equal(cursorProjection.buckets[0].complete, true);
assert.equal(cursorProjection.buckets[1].complete, false);
assert.equal(cursorProjection.buckets[1].cursorCapped, true);
assert.equal(cursorProjection.buckets[1].sourceCount, 1);

assert.throws(
  () => projectSourceBarsToChartData({
    bars: sourceBars,
    sourceTimeframe: 1,
    targetTimeframe: '1M',
  }),
  /not supported/,
);
assert.throws(
  () => projectSourceBarsToChartData({
    bars: sourceBars,
    instrument: 'YM',
    sourceTimeframe: 1,
    targetTimeframe: '1M',
  }),
  /not supported/,
);

console.log('v6 monthly projection domain step270 smoke passed');
