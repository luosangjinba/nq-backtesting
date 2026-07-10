import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

const hostListeners = new Map();
const host = {
  addEventListener(eventName, handler) {
    hostListeners.set(eventName, handler);
  },
  clientHeight: 360,
  clientWidth: 640,
  dataset: { v6PaneId: 'main' },
  getBoundingClientRect() {
    return { height: 360, width: 640 };
  },
  isConnected: true,
  removeEventListener() {},
};
const root = {
  querySelector(selector) {
    return selector === '[data-v6-chart-engine-host]' ? host : null;
  },
};

const calls = [];
let dataLength = 0;
let visibleLogicalRange = { from: -40, to: 60 };
const surface = mountWorkstationChartSurface(root, {
  managerFactory() {
    return {
      destroyAll() {},
      mountPane() {},
      resizePane() {
        return null;
      },
      measureVisibleLogicalRange() {
        calls.push({ method: 'measureVisibleLogicalRange', paneId: 'main', range: { ...visibleLogicalRange } });
        return { ...visibleLogicalRange };
      },
      setData(paneId, bars = []) {
        dataLength = bars.length;
        calls.push({ length: bars.length, method: 'setData', paneId });
        return {
          paneId,
          snapshot: {
            dataLength,
            mounted: true,
            visibleLogicalRange,
          },
        };
      },
      setVisibleLogicalRange(paneId, range) {
        visibleLogicalRange = { ...range };
        calls.push({ method: 'setVisibleLogicalRange', paneId, range: { ...range } });
        return {
          paneId,
          snapshot: {
            dataLength,
            mounted: true,
            visibleLogicalRange,
          },
        };
      },
      snapshot() {
        return {
          panes: [{
            paneId: 'main',
            snapshot: {
              dataLength,
              mounted: true,
              visibleLogicalRange,
            },
          }],
        };
      },
      subscribeCrosshairMove() {
        return () => {};
      },
      subscribeVisibleLogicalRangeChange(paneId, handler) {
        handler({ paneId, range: visibleLogicalRange });
        return () => {};
      },
    };
  },
});

surface.applyChartDataRecord({
  bars: Array.from({ length: 100 }, (_, index) => ({ timestamp: index })),
  paneId: 'main',
  revision: 1,
});
hostListeners.get('wheel')?.({});
surface.applyChartDataRecord({
  bars: Array.from({ length: 125 }, (_, index) => ({ timestamp: index })),
  operation: 'prepend',
  paneId: 'main',
  revision: 2,
});

assert.deepEqual(
  calls.filter((call) => call.method === 'setVisibleLogicalRange').at(-1),
  {
    method: 'setVisibleLogicalRange',
    paneId: 'main',
    range: { from: -15, to: 85 },
  },
);

visibleLogicalRange = { from: -29, to: 71 };
await new Promise((resolve) => setTimeout(resolve, 160));

assert.deepEqual(
  calls.filter((call) => call.method === 'setVisibleLogicalRange').at(-1),
  {
    method: 'setVisibleLogicalRange',
    paneId: 'main',
    range: { from: -15, to: 85 },
  },
);
assert.equal(
  calls.filter((call) => call.method === 'setVisibleLogicalRange').length,
  2,
);

surface.destroy();

console.log('v6 chart surface wheel prepend range stability smoke passed');
