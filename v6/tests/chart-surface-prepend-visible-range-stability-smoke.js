import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

const host = {
  addEventListener() {},
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
let visibleLogicalRange = { from: -20, to: 60 };
const surface = mountWorkstationChartSurface(root, {
  managerFactory() {
    return {
      destroyAll() {},
      mountPane() {},
      resizePane() {
        return null;
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
surface.applyChartDataRecord({
  bars: Array.from({ length: 125 }, (_, index) => ({ timestamp: index })),
  operation: 'prepend',
  paneId: 'main',
  revision: 2,
});

assert.deepEqual(calls, [
  { length: 100, method: 'setData', paneId: 'main' },
  { length: 125, method: 'setData', paneId: 'main' },
  {
    method: 'setVisibleLogicalRange',
    paneId: 'main',
    range: { from: 5, to: 85 },
  },
]);
assert.deepEqual(surface.getState().appliedChartData, [{
  barCount: 125,
  paneId: 'main',
  revision: 2,
}]);

surface.destroy();

console.log('v6 chart surface prepend visible range stability smoke passed');
