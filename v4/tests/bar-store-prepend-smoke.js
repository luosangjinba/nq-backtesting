import assert from 'node:assert/strict';
import {
  clearBars,
  getBars,
  getCurrentRange,
  getRequestedOuterRange,
  prependBarsToCurrentRange,
  setBars,
} from '../src/data/bar-store.js';

clearBars();
setBars(
  [
    { timestamp: 30, close: 30 },
    { timestamp: 40, close: 40 },
  ],
  '2012-01-01 00:30',
  '2012-01-01 00:40',
  1,
  null,
  {
    outerRange: {
      start: '2012-01-01 00:00',
      end: '2012-12-31 23:59',
      timeframe: 1,
    },
    instrument: 'NQ',
  }
);

const result = prependBarsToCurrentRange(
  [
    { timestamp: 10, close: 10 },
    { timestamp: 30, close: 300 },
    { timestamp: 20, close: 20 },
  ],
  '2012-01-01 00:10',
  { instrument: 'NQ' }
);

assert.deepEqual(getBars().map((bar) => [bar.timestamp, bar.close]), [
  [10, 10],
  [20, 20],
  [30, 30],
  [40, 40],
]);
assert.equal(result.addedBars, 2);
assert.deepEqual(getCurrentRange(), {
  start: '2012-01-01 00:10',
  end: '2012-01-01 00:40',
});
assert.equal(getRequestedOuterRange().start, '2012-01-01 00:00');

console.log('bar store prepend smoke passed');
