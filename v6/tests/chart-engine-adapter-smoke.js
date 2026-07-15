import assert from 'node:assert/strict';
import { createLightweightChartAdapter } from '../src/chart-engine/lightweight-chart-adapter.js';

const calls = {
  addSeries: [],
  applyOptions: [],
  createChart: [],
  getVisibleLogicalRange: 0,
  remove: 0,
  resize: [],
  setData: [],
  setVisibleLogicalRange: [],
  subscribeVisibleLogicalRangeChange: 0,
  unsubscribeVisibleLogicalRangeChange: 0,
  update: [],
};

const fakeEngine = {
  CandlestickSeries: Symbol('CandlestickSeries'),
  LineSeries: Symbol('LineSeries'),
  createChart(host, options) {
    calls.createChart.push({ host, options });
    return {
      applyOptions(options) {
        calls.applyOptions.push(options);
      },
      addSeries(seriesType, seriesOptions) {
        calls.addSeries.push({ seriesOptions, seriesType });
        return {
          setData(data) {
            calls.setData.push(data);
          },
          update(bar) {
            calls.update.push(bar);
          },
        };
      },
      remove() {
        calls.remove += 1;
      },
      resize(width, height) {
        calls.resize.push({ height, width });
      },
      timeScale() {
        return {
          getVisibleLogicalRange() {
            calls.getVisibleLogicalRange += 1;
            return { from: 10, to: 20 };
          },
          setVisibleLogicalRange(range) {
            calls.setVisibleLogicalRange.push(range);
          },
          subscribeVisibleLogicalRangeChange(handler) {
            calls.subscribeVisibleLogicalRangeChange += 1;
            handler({ from: 12, to: 22 });
          },
          unsubscribeVisibleLogicalRangeChange() {
            calls.unsubscribeVisibleLogicalRangeChange += 1;
          },
        };
      },
    };
  },
};

const host = { id: 'chart-host' };
const adapter = createLightweightChartAdapter({
  chartOptions: { layout: { textColor: '#fff' } },
  engine: fakeEngine,
  seriesOptions: { priceFormat: { precision: 2 } },
});

  assert.deepEqual(adapter.snapshot(), {
    dataLength: 0,
    daySeparatorCount: 0,
    mounted: false,
    scaffoldPointCount: 0,
  visibleLogicalRange: null,
});

adapter.mount(host);
assert.equal(calls.createChart.length, 1);
assert.equal(calls.addSeries[0].seriesType, fakeEngine.CandlestickSeries);
assert.equal(calls.addSeries[1].seriesType, fakeEngine.LineSeries);
assert.deepEqual(calls.addSeries[1].seriesOptions, {
  crosshairMarkerVisible: false,
  lastValueVisible: false,
  lineVisible: false,
  priceLineVisible: false,
});
adapter.applyOptions({ grid: { horzLines: { color: 'transparent' } } });
assert.deepEqual(calls.applyOptions, [{ grid: { horzLines: { color: 'transparent' } } }]);

adapter.setData([
  { timestamp: 100, open: 1, high: 2, low: 0.5, close: 1.5 },
  { timestamp: 200, open: 2, high: 3, low: 1.5, close: 2.5 },
]);
assert.deepEqual(calls.setData[0].slice(0, 2), [
  { time: 100, open: 1, high: 2, low: 0.5, close: 1.5 },
  { time: 200, open: 2, high: 3, low: 1.5, close: 2.5 },
]);
assert.equal(calls.setData[0].length, 2);
assert.deepEqual(calls.setData[1].slice(0, 3), [
  { time: 260 },
  { time: 320 },
  { time: 380 },
]);
assert.equal(calls.setData[1].every((point) => Object.keys(point).length === 1), true);
assert.equal(adapter.snapshot().dataLength, 2);
assert.equal(adapter.snapshot().scaffoldPointCount, 32);

adapter.update({ timestamp: 300, open: 3, high: 4, low: 2.5, close: 3.5 });
assert.equal(calls.setData.length, 3);
assert.deepEqual(calls.update[0], { time: 300, open: 3, high: 4, low: 2.5, close: 3.5 });
assert.equal(calls.setData[2][0].time, 360);
assert.equal(adapter.snapshot().dataLength, 3);

adapter.update({ timestamp: 300, open: 3, high: 5, low: 2, close: 4 });
assert.equal(calls.setData.length, 3);
assert.deepEqual(calls.update[1], { time: 300, open: 3, high: 5, low: 2, close: 4 });
assert.equal(adapter.snapshot().dataLength, 3);

adapter.setVisibleLogicalRange({ from: 5, to: 12 });
assert.deepEqual(calls.setVisibleLogicalRange[0], { from: 5, to: 12 });
assert.deepEqual(adapter.snapshot().visibleLogicalRange, { from: 5, to: 12 });

assert.deepEqual(adapter.measureVisibleLogicalRange(), { from: 10, to: 20 });
assert.deepEqual(adapter.snapshot().visibleLogicalRange, { from: 10, to: 20 });
const visibleRangeEvents = [];
const unsubscribeVisibleRange = adapter.subscribeVisibleLogicalRangeChange((range) => {
  visibleRangeEvents.push(range);
});
assert.deepEqual(visibleRangeEvents, [{ from: 12, to: 22 }]);
assert.deepEqual(adapter.snapshot().visibleLogicalRange, { from: 12, to: 22 });
unsubscribeVisibleRange();
assert.equal(calls.subscribeVisibleLogicalRangeChange, 1);
assert.equal(calls.unsubscribeVisibleLogicalRangeChange, 1);

adapter.resize({ height: 360, width: 640 });
assert.deepEqual(calls.resize[0], { height: 360, width: 640 });

adapter.destroy();
assert.equal(calls.remove, 1);
  assert.deepEqual(adapter.snapshot(), {
    dataLength: 0,
    daySeparatorCount: 0,
    mounted: false,
    scaffoldPointCount: 0,
  visibleLogicalRange: null,
});

assert.throws(
  () => createLightweightChartAdapter({ engine: {} }).mount(host),
  /createChart/
);

console.log('v6 chart engine adapter smoke passed');
