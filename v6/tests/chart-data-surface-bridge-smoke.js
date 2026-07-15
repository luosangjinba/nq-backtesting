import assert from 'node:assert/strict';
import { CHART_DATA_EVENTS, PANE_EVENTS } from '../src/contracts/app-contracts.js';
import { connectChartDataSurfaceBridge } from '../src/chart-engine/chart-data-surface-bridge.js';

const applied = [];
const appliedTimeframes = [];
const subscriptions = [];
const listeners = new Map();
const chartSurface = {
  applyChartDataRecord(record) {
    applied.push(record);
  },
  applyPaneDisplayTimeframe(paneId, timeframe) {
    appliedTimeframes.push({ paneId, timeframe });
  },
};

const bridge = connectChartDataSurfaceBridge({
  chartSurface,
  subscribeEvent(name, nextListener) {
    subscriptions.push(name);
    listeners.set(name, nextListener);
    return () => {
      listeners.delete(name);
    };
  },
});

assert.deepEqual(subscriptions, [
  CHART_DATA_EVENTS.BARS_CHANGED,
  PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED,
]);

listeners.get(CHART_DATA_EVENTS.BARS_CHANGED)({
  operation: 'replace',
  record: {
    bars: [{ close: 1, high: 2, low: 0.5, open: 1, timestamp: 100 }],
    paneId: 'default',
    revision: 1,
  },
});
listeners.get(CHART_DATA_EVENTS.BARS_CHANGED)({ operation: 'append' });
listeners.get(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED)({
  displayTimeframe: 240,
  id: 'default',
});

assert.equal(applied.length, 1);
assert.equal(applied[0].paneId, 'default');
assert.equal(applied[0].revision, 1);
assert.deepEqual(appliedTimeframes, [{ paneId: 'default', timeframe: 240 }]);

bridge.destroy();
assert.equal(listeners.size, 0);

assert.throws(
  () => connectChartDataSurfaceBridge({ subscribeEvent: () => () => {} }),
  /requires a chart surface/,
);
assert.throws(
  () => connectChartDataSurfaceBridge({ chartSurface }),
  /requires subscribeEvent/,
);

console.log('v6 chart data surface bridge smoke passed');
