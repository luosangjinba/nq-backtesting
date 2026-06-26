import assert from 'node:assert/strict';
import { resolveComparisonLoadRequest } from '../src/ui/comparison/comparison-window-data.js';

const oneMinuteLongRange = resolveComparisonLoadRequest(
  '2012-01-01 00:00',
  '2012-02-29 23:59',
  1,
  'NQ'
);
assert.equal(oneMinuteLongRange.ok, true);
assert.equal(oneMinuteLongRange.comparisonRange.windowed, true);
assert.equal(oneMinuteLongRange.comparisonRange.start, '2012-01-01 00:00');
assert.equal(oneMinuteLongRange.comparisonRange.end, '2012-01-15 00:00');
assert.deepEqual(oneMinuteLongRange.comparisonRange.outerRange, {
  start: '2012-01-01 00:00',
  end: '2012-02-29 23:59',
  timeframe: 1,
});
assert.equal(oneMinuteLongRange.replaySourceRange, null);

const unsupportedShortTimeframeRange = resolveComparisonLoadRequest(
  '2012-01-01 00:00',
  '2012-02-29 23:59',
  2,
  'NQ'
);
assert.equal(unsupportedShortTimeframeRange.ok, false);
assert.match(unsupportedShortTimeframeRange.message, /2m/);

const hourlyShortRange = resolveComparisonLoadRequest(
  '2012-01-01 00:00',
  '2012-01-07 23:59',
  60,
  'NQ'
);
assert.equal(hourlyShortRange.ok, true);
assert.equal(hourlyShortRange.comparisonRange.windowed, false);
assert.deepEqual(hourlyShortRange.replaySourceRange, {
  start: '2012-01-01 00:00',
  end: '2012-01-07 23:59',
  timeframe: 1,
});

const replayFirstBoundedRange = resolveComparisonLoadRequest(
  '2011-12-30 22:00',
  '2012-01-04 02:00',
  60,
  'NQ',
  {
    primaryTimeframe: 1,
    outerRange: {
      start: '2012-01-01 00:00',
      end: '2012-12-31 23:59',
      timeframe: 1,
    },
    replayState: {
      enabled: true,
      cursorTimestamp: 1325503800,
    },
  }
);
assert.equal(replayFirstBoundedRange.ok, true);
assert.equal(replayFirstBoundedRange.comparisonRange.replayFirstBounded, true);
assert.equal(replayFirstBoundedRange.comparisonRange.start, '2012-01-02 09:30');
assert.equal(replayFirstBoundedRange.comparisonRange.end, '2012-01-02 14:30');
assert.deepEqual(replayFirstBoundedRange.replaySourceRange, {
  start: '2012-01-02 09:30',
  end: '2012-01-02 14:30',
  timeframe: 1,
});

console.log('comparison load range smoke passed');
