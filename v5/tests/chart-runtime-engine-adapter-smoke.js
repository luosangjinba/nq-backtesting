import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { CHART_COMMANDS, createChartRuntime } from '../src/runtime/chart-runtime.js';

function createElement(tagName) {
  const listeners = new Map();
  return {
    tagName,
    children: [],
    className: '',
    dataset: {},
    style: {},
    attributes: {},
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
      (listeners.get(event.type) || []).forEach((handler) => handler(event));
    },
    getBoundingClientRect() {
      return {
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

clearCommandsForTest();
clearEventsForTest();

globalThis.document = { createElement };
let mutationCallback = null;
globalThis.MutationObserver = class {
  constructor(callback) {
    mutationCallback = callback;
  }
  observe() {}
  disconnect() {}
};

const engineCalls = {
  created: 0,
  setData: [],
  visibleRangeHandler: null,
  removed: 0,
};
globalThis.LightweightCharts = {
  createChart(hostElement) {
    engineCalls.created += 1;
    engineCalls.engineHost = hostElement;
    return {
      addCandlestickSeries() {
        return {
          setData(data) {
            engineCalls.setData.push(data);
          },
        };
      },
      applyOptions() {},
      timeScale() {
        return {
          setVisibleRange() {},
          subscribeVisibleTimeRangeChange(handler) {
            engineCalls.visibleRangeHandler = handler;
          },
          unsubscribeVisibleTimeRangeChange() {},
        };
      },
      remove() {
        engineCalls.removed += 1;
      },
    };
  },
};

const root = createElement('div');
const host = createElement('div');
host.dataset.chartHost = '';
root.append(host);

const runtime = createChartRuntime();
runtime.start({ root });

assert.equal(host.dataset.chartEngine, 'lightweight-charts');
assert.equal(host.children[0].dataset.chartCanvas, 'true');
assert.equal(host.children[0].children[0].dataset.chartEngineSurface, 'true');
assert.equal(engineCalls.engineHost, host.children[0].children[0]);

const bars = [
  bar(30, 100),
  bar(31, 101),
  bar(32, 102),
  bar(33, 103),
];
await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars });
await dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, {
  enabled: true,
  cursorTimestamp: '2026-06-01T09:33:00.000Z',
  estimatedVisibleBars: 3,
  rightOffsetBars: 1,
});

assert.deepEqual(
  engineCalls.setData.at(-1).map((item) => item.time),
  [
    Date.parse('2026-06-01T09:32:00.000Z') / 1000,
    Date.parse('2026-06-01T09:33:00.000Z') / 1000,
  ]
);
assert.equal(host.dataset.viewportFollow, 'true');
assert.equal(host.dataset.interactionMode, 'follow');
assert.equal(host.children[0].dataset.viewportFollow, 'true');
assert.equal(host.children[0].dataset.interactionMode, 'follow');
assert.equal(host.children[0].dataset.renderedBarCount, '2');
assert.equal(host.children[0].children[1].children[0].dataset.chartBarCount, '2');
assert.equal(host.children[0].children[1].children[0].children[0].title, '2026-06-01 09:32 O:102 H:103 L:101 C:102.5');

host.children[0].dispatchEvent({
  type: 'mousedown',
  button: 0,
  clientX: 400,
});
engineCalls.visibleRangeHandler({
  from: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
});
const interaction = await dispatchCommand(CHART_COMMANDS.GET_INTERACTION_STATE);
assert.equal(interaction.interaction.mode, 'manual');
assert.equal(interaction.viewportFollow.enabled, false);
assert.deepEqual(
  interaction.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:30:00.000Z',
    '2026-06-01T09:31:00.000Z',
  ]
);
assert.equal(host.dataset.interactionMode, 'manual');
assert.equal(host.dataset.viewportFollow, 'false');
assert.equal(host.children[0].dataset.interactionMode, 'manual');
assert.equal(host.children[0].dataset.viewportFollow, 'false');

host.isConnected = false;
await dispatchCommand(CHART_COMMANDS.APPEND_BARS, {
  bars: [bar(34, 104)],
});
assert.equal(engineCalls.removed, 1);
assert.equal(host.children.length, 0);

host.isConnected = true;
mutationCallback();
assert.equal(engineCalls.created, 2);
assert.equal(host.dataset.chartEngine, 'lightweight-charts');
assert.equal(host.children[0].dataset.chartCanvas, 'true');
assert.deepEqual(
  engineCalls.setData.at(-1).map((item) => item.time),
  [
    Date.parse('2026-06-01T09:30:00.000Z') / 1000,
    Date.parse('2026-06-01T09:31:00.000Z') / 1000,
  ]
);

runtime.stop();
assert.equal(engineCalls.removed, 2);
delete globalThis.LightweightCharts;

console.log('v5 chart runtime engine adapter smoke passed');
