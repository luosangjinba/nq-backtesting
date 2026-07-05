import assert from 'node:assert/strict';
import { projectBarsToDisplayTimeframe } from '../src/display-timeframe/display-timeframe-projection.js';

const bars = Array.from({ length: 7 }, (_, index) => ({
  close: 100 + index + 0.5,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: 1780306200 + (index * 60),
}));

const projected = projectBarsToDisplayTimeframe({
  bars,
  cursorTimestamp: 1780306500,
  sourceTimeframe: 1,
  targetTimeframe: 5,
});

assert.deepEqual(projected, [
  {
    close: 104.5,
    high: 105,
    low: 99,
    open: 100,
    timestamp: 1780306200,
  },
  {
    close: 105.5,
    high: 106,
    low: 104,
    open: 105,
    timestamp: 1780306500,
  },
]);

const sameTimeframe = projectBarsToDisplayTimeframe({
  bars,
  cursorTimestamp: 1780306320,
  sourceTimeframe: 1,
  targetTimeframe: 1,
});
assert.deepEqual(sameTimeframe.map((bar) => bar.timestamp), [
  1780306200,
  1780306260,
  1780306320,
]);

assert.throws(
  () => projectBarsToDisplayTimeframe({ bars, sourceTimeframe: 5, targetTimeframe: 1 }),
  /multiple/
);

console.log('v6 display timeframe projection smoke passed');
