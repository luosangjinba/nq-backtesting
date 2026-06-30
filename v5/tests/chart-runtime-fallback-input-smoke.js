import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, hasCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { BAR_DATA_COMMANDS } from '../src/contracts/bar-data-contracts.js';
import { CHART_COMMANDS, CHART_EVENTS, createChartRuntime } from '../src/runtime/chart-runtime.js';

function createElement(tagName) {
  const listeners = new Map();
  return {
    tagName,
    children: [],
    className: '',
    dataset: {},
    style: {},
    attributes: {},
    title: '',
    textContent: '',
    isConnected: true,
    clientWidth: 800,
    clientHeight: 420,
    append(child) {
      this.children.push(child);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      listeners.set(type, handlers.filter((candidate) => candidate !== handler));
    },
    dispatchEvent(event) {
      event.preventDefault ||= () => {
        event.defaultPrevented = true;
      };
      (listeners.get(event.type) || []).forEach((handler) => handler(event));
    },
    getBoundingClientRect() {
      return {
        left: 0,
        width: this.clientWidth,
        height: this.clientHeight,
      };
    },
    querySelectorAll(selector) {
      if (selector !== '[data-chart-host]') return [];
      const matches = [];
      const visit = (node) => {
        if (node.dataset?.chartHost !== undefined) matches.push(node);
        node.children?.forEach(visit);
      };
      visit(this);
      return matches;
    },
  };
}

function bar(minute, open) {
  return {
    time: `2026-06-01T09:${String(minute).padStart(2, '0')}:00.000Z`,
    open,
    high: open + 1,
    low: open - 1,
    close: open + 0.5,
  };
}

function dispatchCanvasEvent(canvas, event) {
  canvas.dispatchEvent(event);
}

clearCommandsForTest();
clearEventsForTest();

globalThis.document = { createElement };
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};
delete globalThis.LightweightCharts;

const root = createElement('div');
const host = createElement('div');
host.dataset.chartHost = '';
root.append(host);

const visibleRangeEvents = [];
const viewportDemandEvents = [];
const unsubscribeVisible = subscribeEvent(CHART_EVENTS.VISIBLE_RANGE_CHANGED, (payload) => {
  visibleRangeEvents.push(payload);
});
const unsubscribeViewportDemand = subscribeEvent(CHART_EVENTS.VIEWPORT_DEMAND, (payload) => {
  viewportDemandEvents.push(payload);
});

const runtime = createChartRuntime();
runtime.start({ root, emitEvent });

assert.equal(hasCommand(BAR_DATA_COMMANDS.LOAD_WINDOW), false);
assert.equal(host.dataset.chartEngine, 'dom-fallback');

const bars = [
  bar(25, 95),
  bar(26, 96),
  bar(27, 97),
  bar(28, 98),
  bar(29, 99),
  bar(30, 100),
  bar(31, 101),
  bar(32, 102),
  bar(33, 103),
  bar(34, 104),
  bar(35, 105),
];
await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars });
await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
  instrument: 'NQ',
  displayTimeframe: 1,
  loadedCoverage: {
    from: '2026-06-01T09:25:00.000Z',
    to: '2026-06-01T09:35:00.000Z',
  },
});
await dispatchCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, {
  rightEdge: '2026-06-01T09:35:00.000Z',
});
await dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, {
  enabled: true,
  cursorTimestamp: '2026-06-01T09:35:00.000Z',
  estimatedVisibleBars: 6,
  rightOffsetBars: 1,
});

const canvas = host.children[0];
assert.equal(canvas.dataset.interactionMode, 'follow');
assert.equal(canvas.dataset.viewportFollow, 'true');

dispatchCanvasEvent(canvas, {
  type: 'mousedown',
  button: 0,
  clientX: 400,
});
dispatchCanvasEvent(canvas, {
  type: 'mousemove',
  clientX: 800,
});
dispatchCanvasEvent(canvas, { type: 'mouseup' });

const dragged = await dispatchCommand(CHART_COMMANDS.GET_INTERACTION_STATE);
assert.equal(dragged.interaction.mode, 'manual');
assert.equal(dragged.viewportFollow.enabled, false);
assert.deepEqual(dragged.visibleRange, {
  from: Date.parse('2026-06-01T09:29:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
});
assert.deepEqual(
  dragged.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:29:00.000Z',
    '2026-06-01T09:30:00.000Z',
    '2026-06-01T09:31:00.000Z',
    '2026-06-01T09:32:00.000Z',
    '2026-06-01T09:33:00.000Z',
  ]
);
assert.equal(canvas.dataset.interactionMode, 'manual');
assert.equal(canvas.dataset.viewportFollow, 'false');
assert.equal(visibleRangeEvents.length, 1);
assert.equal(viewportDemandEvents.length, 0);

dispatchCanvasEvent(canvas, {
  type: 'wheel',
  clientX: 400,
  deltaY: 1,
});
const zoomed = await dispatchCommand(CHART_COMMANDS.GET_INTERACTION_STATE);
assert.equal(zoomed.interaction.mode, 'manual');
assert.equal(zoomed.viewportFollow.enabled, false);
assert.deepEqual(zoomed.visibleRange, {
  from: Date.parse('2026-06-01T09:28:30.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:30.000Z') / 1000,
});
assert.equal(visibleRangeEvents.length, 2);

await dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, {
  enabled: true,
  cursorTimestamp: '2026-06-01T09:35:00.000Z',
  estimatedVisibleBars: 6,
});
const afterReplaySync = await dispatchCommand(CHART_COMMANDS.GET_INTERACTION_STATE);
assert.equal(afterReplaySync.interaction.mode, 'manual');
assert.equal(afterReplaySync.viewportFollow.enabled, false);
assert.deepEqual(afterReplaySync.visibleRange, zoomed.visibleRange);

runtime.stop();
unsubscribeVisible();
unsubscribeViewportDemand();

console.log('v5 chart runtime fallback input smoke passed');
