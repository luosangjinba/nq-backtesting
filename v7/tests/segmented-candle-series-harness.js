import assert from 'node:assert/strict';
import { createSegmentedCandleSeriesWriter } from '../src/lightweight-chart-adapter/segmented-candle-series.js';

class FakeSeries {
  constructor(options = {}) {
    this.data = [];
    this.handlers = new Set();
    this.options = { ...options };
  }

  applyOptions(options) { Object.assign(this.options, options); }

  setData(data) {
    this.data = [...data];
    for (const handler of this.handlers) handler('full');
  }

  subscribeDataChanged(handler) { this.handlers.add(handler); }

  unsubscribeDataChanged(handler) { this.handlers.delete(handler); }

  update(bar) {
    const index = this.data.findIndex(({ time }) => time === bar.time);
    if (index === -1) this.data.push(bar);
    else this.data[index] = bar;
    for (const handler of this.handlers) handler('update');
  }
}

function bars(length) {
  return Object.freeze(Array.from({ length }, (_, index) => Object.freeze({
    close: index + 2,
    high: index + 3,
    low: index,
    open: index + 1,
    time: index + 1,
  })));
}

const primarySeries = new FakeSeries();
const added = [];
const removed = [];
let dataChanges = 0;
const writer = createSegmentedCandleSeriesWriter({
  chart: {
    addSeries(_definition, options) {
      const series = new FakeSeries(options);
      added.push(series);
      return series;
    },
    removeSeries(series) { removed.push(series); },
  },
  onDataChanged: () => { dataChanges += 1; },
  primarySeries,
});

const initial = writer.mutate(bars(10), { kind: 'full-replace' });
writer.finalize(initial);
assert.deepEqual(writer.snapshot(), {
  segmentBarLimit: 512,
  segmentCount: 0,
  segmentPointCount: 0,
  visibleSegmentCount: 0,
  viewportMode: 'all',
});

const first = writer.mutate(bars(310), { kind: 'append-replace' });
writer.finalize(first);
assert.equal(writer.snapshot().segmentPointCount, 300);
assert.equal(added[0].data.length, 300);

const second = writer.mutate(bars(610), { kind: 'append-replace' });
writer.finalize(second);
assert.deepEqual(writer.snapshot(), {
  segmentBarLimit: 512,
  segmentCount: 2,
  segmentPointCount: 600,
  visibleSegmentCount: 2,
  viewportMode: 'all',
});
assert.deepEqual(added.map(({ data }) => data.length), [512, 88]);

writer.setVisibleLogicalRange({ from: 550, to: 620 });
assert.deepEqual(added.map(({ options }) => options.visible), [false, true]);
assert.equal(writer.snapshot().visibleSegmentCount, 1);
writer.showAll();
assert.deepEqual(added.map(({ options }) => options.visible), [true, true]);

const beforeRollbackChanges = dataChanges;
const rollback = writer.mutate(bars(1_210), { kind: 'append-replace' });
assert.equal(writer.snapshot().segmentCount, 3,
  'one oversized Replay advance must split into bounded series chunks');
assert.ok(added.every(({ data }) => data.length <= writer.snapshot().segmentBarLimit));
writer.rollback(rollback);
assert.equal(writer.snapshot().segmentCount, 2);
assert.deepEqual(added.slice(0, 2).map(({ data }) => data.length), [512, 88]);
assert.equal(removed.length, 1, 'rollback must remove a transaction-created series');
assert.ok(dataChanges > beforeRollbackChanges, 'rollback must restore observed series data');

const replacement = writer.mutate(bars(20), { kind: 'full-replace' });
writer.finalize(replacement);
assert.equal(writer.snapshot().segmentCount, 0);
assert.equal(removed.length, 3, 'finalized full replacement must remove every orphaned series');
writer.dispose();
assert.equal(primarySeries.handlers.size, 0);

console.log('v7 Segmented Candle Series harness passed');
