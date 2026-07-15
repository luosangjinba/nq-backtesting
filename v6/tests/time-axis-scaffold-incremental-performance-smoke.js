import assert from 'node:assert/strict';
import { createLightweightChartAdapter } from '../src/chart-engine/lightweight-chart-adapter.js';

const calls = {
  candleSetData: 0,
  candleUpdate: 0,
  scaffoldSetData: 0,
};
const CandlestickSeries = Symbol('CandlestickSeries');
const LineSeries = Symbol('LineSeries');
const engine = {
  CandlestickSeries,
  LineSeries,
  createChart() {
    return {
      addSeries(type) {
        const candle = type === CandlestickSeries;
        return {
          attachPrimitive() {},
          setData() {
            if (candle) calls.candleSetData += 1;
            else calls.scaffoldSetData += 1;
          },
          update() {
            if (candle) calls.candleUpdate += 1;
          },
        };
      },
      remove() {},
      timeScale() {
        return {};
      },
    };
  },
};

const adapter = createLightweightChartAdapter({ engine });
adapter.mount({});
adapter.setData([
  { close: 1, high: 2, low: 0, open: 1, timestamp: 60 },
]);

for (let index = 2; index <= 1001; index += 1) {
  adapter.update({ close: index, high: index, low: index, open: index, timestamp: index * 60 });
}

assert.equal(calls.candleSetData, 1, 'incremental Replay must not rebuild candle data');
assert.equal(calls.candleUpdate, 1000);
assert.equal(calls.scaffoldSetData, 1001);
assert.equal(adapter.snapshot().dataLength, 1001);
adapter.destroy();

console.log('v6 time axis scaffold incremental performance smoke passed');
