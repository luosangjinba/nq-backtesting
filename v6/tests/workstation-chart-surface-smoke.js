import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

const calls = [];
const host = {
  clientHeight: 360,
  clientWidth: 640,
  dataset: { v6PaneId: 'default' },
  getBoundingClientRect() {
    return { height: 360, width: 640 };
  },
  isConnected: true,
};
const root = {
  querySelector(selector) {
    calls.push({ method: 'querySelector', selector });
    return host;
  },
};

function managerFactory(options) {
  calls.push({ method: 'managerFactory', options });
  let crosshairHandler = null;
  let dataLength = 0;
  let mounted = false;
  let visibleLogicalRange = null;
  return {
    destroyAll() {
      calls.push({ method: 'destroyAll' });
      mounted = false;
    },
    mountPane(record) {
      calls.push({ method: 'mountPane', record });
      mounted = true;
    },
    resizePane(paneId, size) {
      calls.push({ method: 'resizePane', paneId, size });
      return {
        paneId,
        snapshot: {
          dataLength: 0,
          mounted,
          visibleLogicalRange: null,
        },
      };
    },
    setData(paneId, bars = []) {
      calls.push({ length: bars.length, method: 'setData', paneId });
      dataLength = bars.length;
      return {
        paneId,
        snapshot: {
          dataLength,
          mounted,
          visibleLogicalRange: null,
        },
      };
    },
    setVisibleLogicalRange(paneId, range) {
      calls.push({ method: 'setVisibleLogicalRange', paneId, range: { ...range } });
      visibleLogicalRange = { ...range };
      return {
        paneId,
        snapshot: {
          dataLength,
          mounted,
          visibleLogicalRange,
        },
      };
    },
    snapshot() {
      return {
        panes: mounted
          ? [{
              paneId: 'default',
              snapshot: {
                dataLength,
                mounted: true,
                visibleLogicalRange,
              },
            }]
          : [],
      };
    },
    subscribeVisibleLogicalRangeChange(paneId, handler) {
      calls.push({ method: 'subscribeVisibleLogicalRangeChange', paneId });
      handler({
        paneId,
        range: { from: -9, to: 6 },
      });
      return () => calls.push({ method: 'unsubscribeVisibleLogicalRangeChange', paneId });
    },
    subscribeCrosshairMove(paneId, handler) {
      calls.push({ method: 'subscribeCrosshairMove', paneId });
      crosshairHandler = handler;
      return () => calls.push({ method: 'unsubscribeCrosshairMove', paneId });
    },
    triggerCrosshair(payload) {
      crosshairHandler?.(payload);
    },
  };
}

const emittedEvents = [];
let managerInstance = null;
const surface = mountWorkstationChartSurface(root, {
  emitEvent: (eventName, payload) => emittedEvents.push({ eventName, payload }),
  managerFactory(options) {
    managerInstance = managerFactory(options);
    return managerInstance;
  },
});
const state = surface.getState();

assert.equal(calls[0].method, 'querySelector');
assert.equal(calls[0].selector, '[data-v6-chart-engine-host]');
assert.equal(calls[1].method, 'managerFactory');
assert.equal(calls[1].options.chartOptions.height, 360);
assert.equal(calls[1].options.chartOptions.width, 640);
assert.equal(calls[2].method, 'mountPane');
assert.equal(calls[2].record.host, host);
assert.equal(calls[2].record.paneId, 'default');
assert.deepEqual(state, {
  appliedChartData: [],
  appliedViewport: [],
  crosshair: [],
  hostConnected: true,
  hostSelector: '[data-v6-chart-engine-host]',
  measuredVisibleRange: [{
    from: -9,
    paneId: 'default',
    to: 6,
  }],
  panes: [{
    paneId: 'default',
    snapshot: {
      dataLength: 0,
      mounted: true,
      visibleLogicalRange: null,
    },
  }],
});

let subscribedCrosshair = null;
const unsubscribeCrosshair = surface.subscribeCrosshairChange((payload) => {
  subscribedCrosshair = payload;
});
managerInstance.triggerCrosshair({
  bar: { close: 2, high: 3, low: 1, open: 1.5, timestamp: 200 },
  paneId: 'default',
  point: { x: 12, y: 34 },
  time: 200,
});
assert.deepEqual(subscribedCrosshair, {
  bar: { close: 2, high: 3, low: 1, open: 1.5, timestamp: 200 },
  paneId: 'default',
  point: { x: 12, y: 34 },
  time: 200,
});
assert.deepEqual(surface.getState().crosshair, [subscribedCrosshair]);
assert.deepEqual(emittedEvents, [{
  eventName: 'chartSurface:crosshairChanged',
  payload: subscribedCrosshair,
}]);
unsubscribeCrosshair();

assert.equal(surface.applyChartDataRecord({
  bars: [
    { close: 1, high: 2, low: 0.5, open: 1, timestamp: 100 },
    { close: 2, high: 3, low: 1.5, open: 2, timestamp: 200 },
  ],
  paneId: 'default',
  revision: 7,
}).snapshot.dataLength, 2);
assert.equal(surface.applyChartDataRecord({
  bars: [{ close: 9, high: 10, low: 8, open: 9, timestamp: 900 }],
  paneId: 'other',
  revision: 1,
}), null);
assert.deepEqual(surface.getState().appliedChartData, [{
  barCount: 2,
  paneId: 'default',
  revision: 7,
}]);
assert.deepEqual(calls.find((call) => call.method === 'setData'), {
  length: 2,
  method: 'setData',
  paneId: 'default',
});

assert.equal(surface.applyViewportProjection({
  chartBarsRevision: 7,
  paneId: 'default',
  projection: {
    from: -110,
    origin: 'default',
    revision: 0,
    to: 10,
  },
}).snapshot.visibleLogicalRange.to, 10);
assert.equal(surface.applyViewportProjection({
  chartBarsRevision: 1,
  paneId: 'other',
  projection: { from: 1, origin: 'manual', revision: 1, to: 2 },
}), null);
assert.equal(surface.applyViewportProjection({
  chartBarsRevision: 1,
  paneId: 'default',
}), null);
assert.deepEqual(surface.getState().appliedViewport, [{
  chartBarsRevision: 7,
  from: -110,
  origin: 'default',
  paneId: 'default',
  projectionRevision: 0,
  to: 10,
}]);
assert.deepEqual(calls.find((call) => call.method === 'setVisibleLogicalRange'), {
  method: 'setVisibleLogicalRange',
  paneId: 'default',
  range: { from: -110, to: 10 },
});

surface.resize();
assert.deepEqual(calls.find((call) => call.method === 'resizePane'), {
  method: 'resizePane',
  paneId: 'default',
  size: { height: 360, width: 640 },
});

surface.destroy();
assert.deepEqual(calls.slice(-3), [
  { method: 'unsubscribeCrosshairMove', paneId: 'default' },
  { method: 'unsubscribeVisibleLogicalRangeChange', paneId: 'default' },
  { method: 'destroyAll' },
]);

assert.throws(
  () => mountWorkstationChartSurface(null),
  /root is required/,
);
assert.throws(
  () => mountWorkstationChartSurface({ querySelector: () => null }),
  /host .* is missing/,
);
assert.throws(
  () => surface.applyChartDataRecord({ bars: [] }),
  /requires paneId/,
);
assert.throws(
  () => surface.applyViewportProjection({ projection: { from: 0, to: 1 } }),
  /requires paneId/,
);

console.log('v6 workstation chart surface smoke passed');
