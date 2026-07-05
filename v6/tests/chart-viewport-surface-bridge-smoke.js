import assert from 'node:assert/strict';
import { CHART_VIEWPORT_EVENTS } from '../src/contracts/app-contracts.js';
import { connectChartViewportSurfaceBridge } from '../src/chart-engine/chart-viewport-surface-bridge.js';

const applied = [];
const subscriptions = [];
let listener = null;
const chartSurface = {
  applyViewportProjection(record) {
    applied.push(record);
  },
};

const bridge = connectChartViewportSurfaceBridge({
  chartSurface,
  subscribeEvent(name, nextListener) {
    subscriptions.push(name);
    listener = nextListener;
    return () => {
      listener = null;
    };
  },
});

assert.deepEqual(subscriptions, [CHART_VIEWPORT_EVENTS.PROJECTED]);

listener({
  chartBarsRevision: 2,
  paneId: 'default',
  projection: {
    from: -53,
    origin: 'manual',
    revision: 1,
    to: 7,
  },
});

assert.equal(applied.length, 1);
assert.equal(applied[0].paneId, 'default');
assert.equal(applied[0].projection.origin, 'manual');

bridge.destroy();
assert.equal(listener, null);

assert.throws(
  () => connectChartViewportSurfaceBridge({ subscribeEvent: () => () => {} }),
  /requires a chart surface/,
);
assert.throws(
  () => connectChartViewportSurfaceBridge({ chartSurface }),
  /requires subscribeEvent/,
);

console.log('v6 chart viewport surface bridge smoke passed');
