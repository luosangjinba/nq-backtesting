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
assert.equal(oneMinuteLongRange.comparisonRange.end, '2012-02-15 00:00');
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

console.log('comparison load range smoke passed');
