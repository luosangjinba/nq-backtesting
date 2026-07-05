import assert from 'node:assert/strict';
import { CHART_DATA_EVENTS } from '../src/contracts/app-contracts.js';
import { connectChartDataSurfaceBridge } from '../src/chart-engine/chart-data-surface-bridge.js';

const applied = [];
const subscriptions = [];
let listener = null;
const chartSurface = {
  applyChartDataRecord(record) {
    applied.push(record);
  },
};

const bridge = connectChartDataSurfaceBridge({
  chartSurface,
  subscribeEvent(name, nextListener) {
    subscriptions.push(name);
    listener = nextListener;
    return () => {
      listener = null;
    };
  },
});

assert.deepEqual(subscriptions, [CHART_DATA_EVENTS.BARS_CHANGED]);

listener({
  operation: 'replace',
  record: {
    bars: [{ close: 1, high: 2, low: 0.5, open: 1, timestamp: 100 }],
    paneId: 'default',
    revision: 1,
  },
});
listener({ operation: 'append' });

assert.equal(applied.length, 1);
assert.equal(applied[0].paneId, 'default');
assert.equal(applied[0].revision, 1);

bridge.destroy();
assert.equal(listener, null);

assert.throws(
  () => connectChartDataSurfaceBridge({ subscribeEvent: () => () => {} }),
  /requires a chart surface/,
);
assert.throws(
  () => connectChartDataSurfaceBridge({ chartSurface }),
  /requires subscribeEvent/,
);

console.log('v6 chart data surface bridge smoke passed');
