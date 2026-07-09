import assert from 'node:assert/strict';
import {
  filterNoFutureBars,
  mergeChartBars,
} from '../src/chart-data/chart-bars.js';
import { createChartDataStore } from '../src/chart-data/chart-data-store.js';

const bars = [
  { timestamp: 300, open: 3, high: 4, low: 2, close: 3.5 },
  { timestamp: 100, open: 1, high: 2, low: 0.5, close: 1.5 },
  { timestamp: 200, open: 2, high: 3, low: 1.5, close: 2.5 },
  { timestamp: 200, open: 999, high: 999, low: 999, close: 999 },
];

assert.deepEqual(
  filterNoFutureBars(bars, 200).map((bar) => [bar.timestamp, bar.open]),
  [[100, 1], [200, 2]]
);

assert.deepEqual(
  filterNoFutureBars(bars, '200').map((bar) => [bar.timestamp, bar.open]),
  [[100, 1], [200, 2]]
);

assert.throws(
  () => filterNoFutureBars(bars, '2026-06-01 09:30:00'),
  /Chart data cursorTimestamp must be finite/,
);

assert.deepEqual(
  mergeChartBars(
    [{ timestamp: 100, open: 1, high: 2, low: 0.5, close: 1.5 }],
    [
      { timestamp: 200, open: 2, high: 3, low: 1.5, close: 2.5 },
      { timestamp: 300, open: 3, high: 4, low: 2, close: 3.5 },
    ],
    200
  ).map((bar) => bar.timestamp),
  [100, 200]
);

const store = createChartDataStore();
const empty = store.getRecord('pane-default');
assert.deepEqual(empty, {
  bars: [],
  paneId: 'pane-default',
  revision: 0,
});

const replaced = store.replaceBars({
  bars,
  cursorTimestamp: 200,
  paneId: 'pane-default',
});
assert.equal(replaced.revision, 1);
assert.deepEqual(replaced.bars.map((bar) => bar.timestamp), [100, 200]);

const appended = store.appendBars({
  bars: [
    { timestamp: 240, open: 2.4, high: 3, low: 2, close: 2.5 },
    { timestamp: 360, open: 3.6, high: 4, low: 3, close: 3.5 },
  ],
  cursorTimestamp: 240,
  paneId: 'pane-default',
});
assert.equal(appended.revision, 2);
assert.deepEqual(appended.bars.map((bar) => bar.timestamp), [100, 200, 240]);

appended.bars[0].close = 0;
assert.equal(store.getRecord('pane-default').bars[0].close, 1.5);

store.replaceBars({
  bars: [{ timestamp: 100, open: 10, high: 11, low: 9, close: 10.5 }],
  paneId: 'pane-review',
});
assert.deepEqual(store.summary(), {
  paneCount: 2,
  panes: [
    { barCount: 3, paneId: 'pane-default', revision: 2 },
    { barCount: 1, paneId: 'pane-review', revision: 1 },
  ],
});

assert.equal(store.clearPane('pane-default').revision, 0);
assert.equal(store.getRecord('pane-default').bars.length, 0);

console.log('v6 chart data domain smoke passed');
