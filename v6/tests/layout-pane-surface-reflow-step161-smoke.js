import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

function createHost(paneId, { height = 360, width = 900 } = {}) {
  const attributes = new Map();
  return {
    clientHeight: height,
    clientWidth: width,
    dataset: { v6PaneId: paneId },
    hidden: false,
    isConnected: true,
    style: {},
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    getBoundingClientRect() {
      return { height, width };
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
  };
}

const calls = [];
const chartSurfaceElement = { dataset: {} };
const chartPaneLayerElement = { dataset: {} };
const hosts = [
  createHost('main', { height: 420, width: 900 }),
  createHost('secondary', { height: 420, width: 440 }),
  createHost('tertiary', { height: 420, width: 290 }),
];
const root = {
  querySelector(selector) {
    if (selector === '[data-v6-chart-pane-layer]') {
      return chartPaneLayerElement;
    }
    return selector === '[data-v6-chart-surface]' ? chartSurfaceElement : null;
  },
  querySelectorAll(selector) {
    calls.push({ method: 'querySelectorAll', selector });
    return selector === '[data-v6-chart-engine-host]' ? hosts : [];
  },
};

function managerFactory() {
  const records = new Map();
  return {
    destroyAll() {
      calls.push({ method: 'destroyAll' });
      records.clear();
    },
    mountPane({ paneId }) {
      calls.push({ method: 'mountPane', paneId });
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
      return {
        paneId,
        snapshot: { ...records.get(paneId) },
      };
    },
    setVisibleLogicalRange(paneId, range) {
      calls.push({ method: 'setVisibleLogicalRange', paneId, range: { ...range } });
      return {
        paneId,
        snapshot: { ...records.get(paneId) },
      };
    },
    snapshot() {
      return {
        panes: [...records.entries()]
          .map(([paneId, snapshot]) => ({ paneId, snapshot: { ...snapshot } }))
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
      };
    },
    subscribeCrosshairMove() {
      return () => {};
    },
    subscribeVisibleLogicalRangeChange() {
      return () => {};
    },
  };
}

const surface = mountWorkstationChartSurface(root, { managerFactory });

assert.deepEqual(
  calls.filter((call) => call.method === 'mountPane').map((call) => call.paneId),
  ['main', 'secondary', 'tertiary'],
);
assert.deepEqual(surface.getState().layout, {
  mode: 'single',
  paneCount: 1,
  variant: 'single',
  visiblePaneIds: ['main'],
});

calls.length = 0;
const twice = surface.applyLayoutSnapshot({ mode: 'twice' });
assert.deepEqual(twice, {
  mode: 'twice',
  paneCount: 2,
  variant: 'twice-vertical',
  visiblePaneIds: ['main', 'secondary'],
});
assert.equal(chartSurfaceElement.dataset.v6ChartLayoutMode, 'twice');
assert.equal(chartSurfaceElement.dataset.v6ChartLayoutPaneCount, '2');
assert.equal(chartSurfaceElement.dataset.v6ChartLayoutVariant, 'twice-vertical');
assert.equal(chartPaneLayerElement.dataset.v6ChartLayoutMode, 'twice');
assert.equal(chartPaneLayerElement.dataset.v6ChartLayoutPaneCount, '2');
assert.equal(chartPaneLayerElement.dataset.v6ChartLayoutVariant, 'twice-vertical');
assert.deepEqual(hosts.map((host) => host.hidden), [false, false, true]);
assert.deepEqual(hosts.map((host) => host.dataset.v6ChartPaneVisible), ['true', 'true', 'false']);
assert.deepEqual(hosts.map((host) => host.dataset.v6ChartPaneSlot), ['1', '2', '']);
assert.deepEqual(hosts.map((host) => host.style.gridArea), [
  '1 / 1 / 2 / 2',
  '1 / 2 / 2 / 3',
  '',
]);
assert.equal(hosts[2].getAttribute('aria-hidden'), 'true');
assert.deepEqual(
  calls.filter((call) => call.method === 'resizePane').map((call) => [call.paneId, call.size]),
  [
    ['main', { height: 420, width: 900 }],
    ['secondary', { height: 420, width: 440 }],
  ],
);

calls.length = 0;
const horizontal = surface.applyLayoutSnapshot({ mode: 'twice', variant: 'twice-horizontal' });
assert.deepEqual(horizontal, {
  mode: 'twice',
  paneCount: 2,
  variant: 'twice-horizontal',
  visiblePaneIds: ['main', 'secondary'],
});
assert.equal(chartSurfaceElement.dataset.v6ChartLayoutVariant, 'twice-horizontal');
assert.deepEqual(hosts.map((host) => host.style.gridArea), [
  '1 / 1 / 2 / 2',
  '2 / 1 / 3 / 2',
  '',
]);

calls.length = 0;
const triple = surface.applyLayoutSnapshot({ mode: 'triple', variant: 'triple-right-stack' });
assert.equal(triple.variant, 'triple-right-stack');
assert.deepEqual(triple.visiblePaneIds, ['main', 'secondary', 'tertiary']);
assert.deepEqual(hosts.map((host) => host.hidden), [false, false, false]);
assert.deepEqual(hosts.map((host) => host.style.gridArea), [
  '1 / 1 / 3 / 2',
  '1 / 2 / 2 / 3',
  '2 / 2 / 3 / 3',
]);
assert.equal(hosts[2].getAttribute('aria-hidden'), null);
assert.deepEqual(
  calls.filter((call) => call.method === 'resizePane').map((call) => call.paneId),
  ['main', 'secondary', 'tertiary'],
);

calls.length = 0;
const single = surface.applyLayoutSnapshot({ mode: 'single' });
assert.deepEqual(single.visiblePaneIds, ['main']);
assert.deepEqual(hosts.map((host) => host.hidden), [false, true, true]);
assert.equal(hosts[1].getAttribute('aria-hidden'), 'true');
assert.equal(hosts[2].getAttribute('aria-hidden'), 'true');
assert.deepEqual(
  calls.filter((call) => call.method === 'resizePane').map((call) => call.paneId),
  ['main'],
);
assert.deepEqual(surface.getState().layout, {
  mode: 'single',
  paneCount: 1,
  variant: 'single',
  visiblePaneIds: ['main'],
});
assert.equal(calls.some((call) => call.method === 'setData'), false);
assert.equal(calls.some((call) => call.method === 'setVisibleLogicalRange'), false);
assert.throws(() => surface.applyLayoutSnapshot({ mode: 'quad' }), /Unsupported chart surface layout mode/);
assert.throws(
  () => surface.applyLayoutSnapshot({ mode: 'twice', variant: 'triple-columns' }),
  /Unsupported chart surface layout variant/,
);

surface.destroy();

console.log('v6 layout pane surface reflow step 161 smoke passed');
