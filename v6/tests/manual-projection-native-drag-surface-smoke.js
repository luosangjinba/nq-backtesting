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
let visibleHandler = null;
let visibleLogicalRange = null;
const surface = mountWorkstationChartSurface(root, {
  managerFactory() {
    return {
      destroyAll() {},
      mountPane() {},
      resizePane() {
        return null;
      },
      setData() {
        return null;
      },
      setVisibleLogicalRange(paneId, range) {
        calls.push({ method: 'setVisibleLogicalRange', paneId, range: { ...range } });
        visibleLogicalRange = { ...range };
        return {
          paneId,
          snapshot: {
            dataLength: 0,
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
              dataLength: 0,
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
        visibleHandler = handler;
        return () => {};
      },
    };
  },
});

surface.applyViewportProjection({
  chartBarsRevision: 1,
  paneId: 'main',
  projection: {
    from: -110,
    origin: 'default',
    revision: 0,
    to: 10,
  },
});
assert.deepEqual(calls, [{
  method: 'setVisibleLogicalRange',
  paneId: 'main',
  range: { from: -110, to: 10 },
}]);

host.dispatchEvent?.({ type: 'mousedown' });
visibleHandler?.({
  paneId: 'main',
  range: { from: -58, to: 42 },
});
const result = surface.applyViewportProjection({
  chartBarsRevision: 1,
  paneId: 'main',
  projection: {
    from: -58,
    origin: 'manual',
    revision: 1,
    to: 42,
  },
});

assert.equal(result.paneId, 'main');
assert.equal(calls.length, 1);
assert.deepEqual(surface.getState().appliedViewport, [{
  chartBarsRevision: 1,
  from: -58,
  origin: 'manual',
  paneId: 'main',
  projectionRevision: 1,
  to: 42,
}]);

surface.applyViewportProjection({
  chartBarsRevision: 1,
  paneId: 'main',
  projection: {
    from: -70,
    origin: 'manual',
    revision: 2,
    to: 30,
  },
});
assert.deepEqual(calls.at(-1), {
  method: 'setVisibleLogicalRange',
  paneId: 'main',
  range: { from: -70, to: 30 },
});

surface.destroy();

console.log('v6 manual projection native drag surface smoke passed');
