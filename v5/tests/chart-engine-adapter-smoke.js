import assert from 'node:assert/strict';
import { createChartEngineAdapter } from '../src/runtime/chart-engine-adapter.js';

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
      };
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

const documentRef = { createElement };

const fallbackVisibleRangeEvents = [];
const fallbackHost = createElement('div');
const fallback = createChartEngineAdapter({ engine: null, documentRef });
fallback.mount(fallbackHost, {
  displayContext: {
    rightOffsetBars: 2,
    margins: { topPercent: 8, bottomPercent: 12 },
  },
  onVisibleRangeChange: (range) => fallbackVisibleRangeEvents.push(range),
});
fallback.setBars([bar(30, 100), bar(31, 101)], { fullBarCount: 12 });
fallback.setVisibleRange({
  from: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
});
fallbackHost.children[0].dispatchEvent({
  type: 'mousedown',
  button: 0,
  clientX: 400,
});
fallbackHost.children[0].dispatchEvent({
  type: 'mousemove',
  clientX: 800,
});
fallbackHost.children[0].dispatchEvent({
  type: 'mouseup',
});
fallbackHost.children[0].dispatchEvent({
  type: 'wheel',
  clientX: 400,
  deltaY: -1,
});

assert.equal(fallback.readState().engineType, 'dom-fallback');
assert.equal(fallback.readState().barCount, 2);
assert.equal(fallback.readState().fullBarCount, 12);
assert.equal(fallbackHost.dataset.chartEngine, 'dom-fallback');
assert.equal(fallbackHost.children[0].dataset.renderedBarCount, '2');
assert.equal(fallbackHost.children[0].dataset.fullBarCount, '12');
assert.equal(fallbackVisibleRangeEvents.length, 2);
assert.deepEqual(fallbackVisibleRangeEvents[0], {
  from: Date.parse('2026-06-01T09:29:30.000Z') / 1000,
  to: Date.parse('2026-06-01T09:30:30.000Z') / 1000,
});
assert.deepEqual(fallbackVisibleRangeEvents[1], {
  from: Date.parse('2026-06-01T09:29:30.000Z') / 1000,
  to: Date.parse('2026-06-01T09:30:30.000Z') / 1000,
});
fallback.destroy();
assert.equal(fallbackHost.children.length, 0);

const lightweightCalls = {
  created: 0,
  setData: [],
  setVisibleRange: [],
  applyOptions: [],
  subscribed: null,
  unsubscribed: null,
  removed: 0,
};
const fakeLightweightCharts = {
  createChart(host, options) {
    lightweightCalls.created += 1;
    lightweightCalls.host = host;
    lightweightCalls.options = options;
    return {
      addCandlestickSeries() {
        return {
          setData(data) {
            lightweightCalls.setData.push(data);
          },
        };
      },
      applyOptions(optionsPayload) {
        lightweightCalls.applyOptions.push(optionsPayload);
      },
      timeScale() {
        return {
          setVisibleRange(range) {
            lightweightCalls.setVisibleRange.push(range);
          },
          subscribeVisibleTimeRangeChange(handler) {
            lightweightCalls.subscribed = handler;
          },
          unsubscribeVisibleTimeRangeChange(handler) {
            lightweightCalls.unsubscribed = handler;
          },
        };
      },
      remove() {
        lightweightCalls.removed += 1;
      },
    };
  },
};

const visibleRangeEvents = [];
const lightweightHost = createElement('div');
const lightweight = createChartEngineAdapter({
  engine: fakeLightweightCharts,
  documentRef,
});
lightweight.mount(lightweightHost, {
  displayContext: { rightOffsetBars: 3 },
  onVisibleRangeChange: (range) => visibleRangeEvents.push(range),
});
lightweight.setBars([bar(32, 102), bar(33, 103)], { fullBarCount: 8 });
lightweight.setPresentation({ rightOffsetBars: 4 });
lightweight.setVisibleRange({
  from: Date.parse('2026-06-01T09:32:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
});
lightweightHost.children[0].dispatchEvent({
  type: 'mousedown',
  button: 0,
  clientX: 400,
});
lightweightCalls.subscribed({
  from: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
});

assert.equal(lightweight.readState().engineType, 'lightweight-charts');
assert.equal(lightweight.readState().barCount, 2);
assert.equal(lightweightCalls.created, 1);
assert.equal(lightweightHost.dataset.chartEngine, 'lightweight-charts');
assert.deepEqual(
  lightweightCalls.setData[0].map((item) => item.time),
  [
    Date.parse('2026-06-01T09:32:00.000Z') / 1000,
    Date.parse('2026-06-01T09:33:00.000Z') / 1000,
  ]
);
assert.deepEqual(lightweightCalls.applyOptions[0], {
  timeScale: { rightOffset: 4 },
});
assert.deepEqual(lightweightCalls.setVisibleRange[0], {
  from: Date.parse('2026-06-01T09:32:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
});
assert.deepEqual(visibleRangeEvents[0], {
  from: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
});
lightweight.destroy();
assert.equal(lightweightCalls.unsubscribed, lightweightCalls.subscribed);
assert.equal(lightweightCalls.removed, 1);

console.log('v5 chart engine adapter smoke passed');
