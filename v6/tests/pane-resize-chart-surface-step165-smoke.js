import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

function createElement(tagName = 'div') {
  const listeners = new Map();
  const element = {
    children: [],
    className: '',
    dataset: {},
    hidden: false,
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
    classList: {
      add(name) {
        element.className = `${element.className} ${name}`.trim();
      },
      remove(name) {
        element.className = element.className.split(/\s+/).filter((part) => part && part !== name).join(' ');
      },
    },
    getListener(name) {
      return listeners.get(name);
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
  return {
    dataset: { v6PaneId: paneId },
    hidden: false,
    isConnected: true,
    style: {},
    getBoundingClientRect() {
      return { height, width };
    },
    removeAttribute() {},
    setAttribute() {},
  };
}

const documentListeners = new Map();
const ownerDocument = {
  addEventListener(name, handler) {
    documentListeners.set(name, handler);
  },
  createElement,
  removeEventListener(name) {
    documentListeners.delete(name);
  },
};

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
        records.set(paneId, { mounted: true });
      },
      resizePane(paneId, size) {
        calls.push({ method: 'resizePane', paneId, size });
        return { paneId, snapshot: { ...records.get(paneId) } };
      },
      snapshot() {
        return {
          panes: [...records.entries()].map(([paneId, snapshot]) => ({ paneId, snapshot })),
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
assert.equal(chartSurfaceElement.children.length, 1);
assert.equal(chartSurfaceElement.children[0].dataset.v6PaneResizeHandle, 'rows:0');
assert.equal(chartPaneLayerElement.style.gridTemplateRows, 'minmax(0, 50fr) minmax(0, 50fr)');
assert.deepEqual(surface.getState().paneResize.handles.map((handle) => [handle.id, handle.orientation]), [
  ['rows:0', 'horizontal'],
]);

surface.resizePaneByHandle('rows:0', { clientY: 500 });
assert.equal(chartPaneLayerElement.style.gridTemplateRows, 'minmax(0, 75fr) minmax(0, 25fr)');
assert.deepEqual(surface.getState().paneResize.ratios.rows.map(Math.round), [75, 25]);

surface.applyLayoutSnapshot({ mode: 'triple', variant: 'triple-right-stack' });
assert.deepEqual(
  surface.getState().paneResize.handles.map((handle) => [handle.id, handle.region]),
  [
    ['columns:0', 'full'],
    ['rows:0', 'right'],
  ],
);
assert.equal(chartSurfaceElement.children.length, 2);
const rightStackRowHandle = chartSurfaceElement.children.find((child) => child.dataset.v6PaneResizeHandle === 'rows:0');
assert.equal(rightStackRowHandle.style.left, '50%');
assert.equal(rightStackRowHandle.style.right, '0');

surface.resizePaneByHandle('columns:0', { clientX: 370 });
assert.equal(chartPaneLayerElement.style.gridTemplateColumns, 'minmax(0, 30fr) minmax(0, 70fr)');
assert.deepEqual(surface.getState().paneResize.ratios.columns.map(Math.round), [30, 70]);

surface.destroy();
assert.equal(chartSurfaceElement.children.every((child) => child.removed), true);

console.log('v6 pane resize chart surface step 165 smoke passed');
