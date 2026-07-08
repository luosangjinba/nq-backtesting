import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

function createHost(paneId, { height = 240, width = 640 } = {}) {
  const listeners = [];
  return {
    clientHeight: height,
    clientWidth: width,
    dataset: { v6PaneId: paneId },
    getBoundingClientRect() {
      return { height, width };
    },
    isConnected: true,
    listeners,
    addEventListener(eventName, handler, options) {
      listeners.push({ eventName, handler, options });
    },
    removeEventListener(eventName, handler) {
      listeners.push({ eventName, handler, removed: true });
    },
  };
}

const calls = [];
const leftHost = createHost('pane-left', { height: 260, width: 500 });
const rightHost = createHost('pane-right', { height: 300, width: 520 });
const root = {
  querySelectorAll(selector) {
    calls.push({ method: 'querySelectorAll', selector });
    return [leftHost, rightHost];
  },
};

function managerFactory(options) {
  calls.push({ method: 'managerFactory', options });
  const records = new Map();
  return {
    destroyAll() {
      calls.push({ method: 'destroyAll' });
      records.clear();
    },
    mountPane({ host, paneId }) {
      calls.push({ host, method: 'mountPane', paneId });
      records.set(paneId, {
        dataLength: 0,
        mounted: true,
        visibleLogicalRange: null,
      });
    },
    resizePane(paneId, size) {
      calls.push({ method: 'resizePane', paneId, size });
      return {
        paneId,
        snapshot: { ...records.get(paneId) },
      };
    },
    setData(paneId, bars = []) {
      calls.push({ length: bars.length, method: 'setData', paneId });
      records.set(paneId, {
        ...records.get(paneId),
        dataLength: bars.length,
      });
      return {
        paneId,
        snapshot: { ...records.get(paneId) },
      };
    },
    setVisibleLogicalRange(paneId, range) {
      calls.push({ method: 'setVisibleLogicalRange', paneId, range: { ...range } });
      records.set(paneId, {
        ...records.get(paneId),
        visibleLogicalRange: { ...range },
      });
      return {
        paneId,
        snapshot: { ...records.get(paneId) },
      };
    },
    snapshot() {
      return {
        panes: [...records.entries()]
          .map(([paneId, snapshot]) => ({
            paneId,
            snapshot: { ...snapshot },
          }))
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
      };
    },
    subscribeVisibleLogicalRangeChange(paneId) {
      calls.push({ method: 'subscribeVisibleLogicalRangeChange', paneId });
      return () => calls.push({ method: 'unsubscribeVisibleLogicalRangeChange', paneId });
    },
  };
}

const surface = mountWorkstationChartSurface(root, { managerFactory });

assert.equal(calls[0].method, 'querySelectorAll');
assert.equal(calls[1].method, 'managerFactory');
assert.equal(calls[1].options.chartOptions.height, 260);
assert.equal(calls[1].options.chartOptions.width, 500);
assert.deepEqual(
  calls.filter((call) => call.method === 'mountPane').map((call) => call.paneId),
  ['pane-left', 'pane-right'],
);
assert.deepEqual(
  calls.filter((call) => call.method === 'subscribeVisibleLogicalRangeChange').map((call) => call.paneId),
  ['pane-left', 'pane-right'],
);
assert.deepEqual(surface.getState().panes.map((pane) => pane.paneId), ['pane-left', 'pane-right']);
assert.equal(surface.getState().hostConnected, true);

surface.applyChartDataRecord({
  bars: [
    { close: 101, high: 102, low: 100, open: 100.5, timestamp: 1780306200 },
    { close: 102, high: 103, low: 101, open: 101.5, timestamp: 1780306260 },
  ],
  paneId: 'pane-left',
  revision: 2,
});
surface.applyChartDataRecord({
  bars: [
    { close: 201, high: 202, low: 200, open: 200.5, timestamp: 1780306200 },
  ],
  paneId: 'pane-right',
  revision: 5,
});
assert.equal(surface.applyChartDataRecord({ bars: [], paneId: 'missing', revision: 1 }), null);
assert.deepEqual(surface.getState().appliedChartData, [
  { barCount: 2, paneId: 'pane-left', revision: 2 },
  { barCount: 1, paneId: 'pane-right', revision: 5 },
]);
assert.deepEqual(
  calls.filter((call) => call.method === 'setData').map((call) => [call.paneId, call.length]),
  [['pane-left', 2], ['pane-right', 1]],
);

surface.applyViewportProjection({
  chartBarsRevision: 2,
  paneId: 'pane-left',
  projection: { from: -20, origin: 'default', revision: 0, to: 10 },
});
surface.applyViewportProjection({
  chartBarsRevision: 5,
  paneId: 'pane-right',
  projection: { from: -12, origin: 'manual', revision: 3, to: 8 },
});
assert.equal(surface.applyViewportProjection({
  chartBarsRevision: 1,
  paneId: 'missing',
  projection: { from: 1, origin: 'default', revision: 0, to: 2 },
}), null);
assert.deepEqual(surface.getState().appliedViewport, [
  {
    chartBarsRevision: 2,
    from: -20,
    origin: 'default',
    paneId: 'pane-left',
    projectionRevision: 0,
    to: 10,
  },
  {
    chartBarsRevision: 5,
    from: -12,
    origin: 'manual',
    paneId: 'pane-right',
    projectionRevision: 3,
    to: 8,
  },
]);
assert.deepEqual(
  calls.filter((call) => call.method === 'setVisibleLogicalRange').map((call) => [call.paneId, call.range]),
  [
    ['pane-left', { from: -20, to: 10 }],
    ['pane-right', { from: -12, to: 8 }],
  ],
);

assert.deepEqual(
  surface.resize().map((record) => [record.paneId, record.snapshot.mounted]),
  [['pane-left', true], ['pane-right', true]],
);
assert.deepEqual(
  calls.filter((call) => call.method === 'resizePane').map((call) => [call.paneId, call.size]),
  [
    ['pane-left', { height: 260, width: 500 }],
    ['pane-right', { height: 300, width: 520 }],
  ],
);

surface.destroy();
assert.deepEqual(calls.slice(-3), [
  { method: 'unsubscribeVisibleLogicalRangeChange', paneId: 'pane-left' },
  { method: 'unsubscribeVisibleLogicalRangeChange', paneId: 'pane-right' },
  { method: 'destroyAll' },
]);
assert.equal(leftHost.listeners.filter((listener) => listener.removed).length, 4);
assert.equal(rightHost.listeners.filter((listener) => listener.removed).length, 4);

assert.throws(
  () => mountWorkstationChartSurface({
    querySelectorAll: () => [createHost('dup'), createHost('dup')],
  }, { managerFactory }),
  /duplicated/,
);

console.log('v6 workstation chart surface multi-pane step 147 smoke passed');
