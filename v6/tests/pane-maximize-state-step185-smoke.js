import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

function createElement(tagName = 'div') {
  const listeners = new Map();
  const element = {
    children: [],
    className: '',
    dataset: {},
    ownerDocument: null,
    style: {},
    tagName: tagName.toUpperCase(),
    addEventListener(name, handler) {
      listeners.set(name, handler);
    },
    appendChild(child) {
      child.parentNode = element;
      element.children.push(child);
    },
    remove() {
      element.removed = true;
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    setAttribute(name, value) {
      element[name] = String(value);
    },
  };
  return element;
}

function createHost(paneId, { height = 300, width = 900 } = {}) {
  const attributes = new Map();
  return {
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

const ownerDocument = { createElement };
const chartSurfaceElement = createElement('section');
chartSurfaceElement.ownerDocument = ownerDocument;
const chartPaneLayerElement = createElement('div');
chartPaneLayerElement.ownerDocument = ownerDocument;
chartPaneLayerElement.getBoundingClientRect = () => ({
  height: 600,
  left: 100,
  top: 50,
  width: 900,
});

const calls = [];
const hosts = [
  createHost('main'),
  createHost('secondary'),
  createHost('tertiary'),
];
const root = {
  ownerDocument,
  querySelector(selector) {
    if (selector === '[data-v6-chart-surface]') return chartSurfaceElement;
    if (selector === '[data-v6-chart-pane-layer]') return chartPaneLayerElement;
    return null;
  },
  querySelectorAll(selector) {
    return selector === '[data-v6-chart-engine-host]' ? hosts : [];
  },
};

const surface = mountWorkstationChartSurface(root, {
  managerFactory() {
    const records = new Map();
    return {
      destroyAll() {
        records.clear();
      },
      mountPane({ paneId }) {
        records.set(paneId, { dataLength: 2, mounted: true, visibleLogicalRange: null });
      },
      resizePane(paneId, size) {
        calls.push({ method: 'resizePane', paneId, size });
        return { paneId, snapshot: { ...records.get(paneId) } };
      },
      setData(paneId, bars = []) {
        calls.push({ method: 'setData', paneId, length: bars.length });
        records.set(paneId, { ...records.get(paneId), dataLength: bars.length });
        return { paneId, snapshot: { ...records.get(paneId) } };
      },
      setVisibleLogicalRange(paneId, range) {
        calls.push({ method: 'setVisibleLogicalRange', paneId, range: { ...range } });
        records.set(paneId, { ...records.get(paneId), visibleLogicalRange: { ...range } });
        return { paneId, snapshot: { ...records.get(paneId) } };
      },
      snapshot() {
        return {
          panes: [...records.entries()].map(([paneId, snapshot]) => ({ paneId, snapshot: { ...snapshot } })),
        };
      },
      subscribeCrosshairMove() {
        return () => {};
      },
      subscribeVisibleLogicalRangeChange() {
        return () => {};
      },
    };
  },
});

surface.applyLayoutSnapshot({ mode: 'twice', variant: 'twice-horizontal' });
surface.resizePaneByHandle('rows:0', { clientY: 500 });
assert.equal(chartPaneLayerElement.style.gridTemplateRows, 'minmax(0, 75fr) minmax(0, 25fr)');

calls.length = 0;
const maximized = surface.maximizePane('secondary');
assert.deepEqual(maximized.visiblePaneIds, ['secondary']);
assert.deepEqual(hosts.map((host) => [host.dataset.v6PaneId, host.hidden, host.dataset.v6ChartPaneVisible, host.style.gridArea]), [
  ['main', true, 'false', ''],
  ['secondary', false, 'true', '1 / 1 / 2 / 2'],
  ['tertiary', true, 'false', ''],
]);
assert.equal(chartPaneLayerElement.style.gridTemplateColumns, 'minmax(0, 1fr)');
assert.equal(chartPaneLayerElement.style.gridTemplateRows, 'minmax(0, 1fr)');
assert.equal(chartPaneLayerElement.dataset.v6ChartMaximizedPaneId, 'secondary');
assert.equal(surface.getState().maximize.maximizedPaneId, 'secondary');
assert.deepEqual(surface.getState().maximize.restoreLayout, {
  mode: 'twice',
  paneCount: 2,
  variant: 'twice-horizontal',
  visiblePaneIds: ['main', 'secondary'],
});
assert.deepEqual(surface.getState().paneResize.handles, []);
assert.equal(chartSurfaceElement.children.every((child) => child.removed), true);
assert.equal(calls.some((call) => call.method === 'setData'), false);
assert.equal(calls.some((call) => call.method === 'setVisibleLogicalRange'), false);

calls.length = 0;
const restored = surface.restorePane();
assert.deepEqual(restored, {
  mode: 'twice',
  paneCount: 2,
  variant: 'twice-horizontal',
  visiblePaneIds: ['main', 'secondary'],
});
assert.deepEqual(hosts.map((host) => [host.dataset.v6PaneId, host.hidden, host.dataset.v6ChartPaneVisible, host.style.gridArea]), [
  ['main', false, 'true', '1 / 1 / 2 / 2'],
  ['secondary', false, 'true', '2 / 1 / 3 / 2'],
  ['tertiary', true, 'false', ''],
]);
assert.equal(chartPaneLayerElement.style.gridTemplateRows, 'minmax(0, 75fr) minmax(0, 25fr)');
assert.equal(chartPaneLayerElement.dataset.v6ChartMaximizedPaneId, '');
assert.equal(surface.getState().maximize.maximizedPaneId, null);
assert.equal(surface.getState().maximize.restoreLayout, null);
assert.deepEqual(surface.getState().paneResize.ratios.rows.map(Math.round), [75, 25]);
assert.equal(calls.some((call) => call.method === 'setData'), false);
assert.equal(calls.some((call) => call.method === 'setVisibleLogicalRange'), false);

assert.throws(() => surface.maximizePane('missing'), /pane "missing" does not exist/);

surface.destroy();

console.log('v6 pane maximize state step 185 smoke passed');
