import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { CHART_COMMANDS, CHART_EVENTS, createChartRuntime } from '../src/runtime/chart-runtime.js';

function createElement(tagName) {
  const listeners = new Map();
  return {
    tagName,
    children: [],
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
      return { width: this.clientWidth, height: this.clientHeight };
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
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

const charts = [];
globalThis.LightweightCharts = {
  createChart() {
    const chartRecord = {
      setDataCalls: [],
      visibleRangeHandler: null,
    };
    charts.push(chartRecord);
    return {
      addCandlestickSeries() {
        return {
          setData(data) {
            chartRecord.setDataCalls.push(data);
          },
        };
      },
      applyOptions() {},
      timeScale() {
        return {
          setVisibleLogicalRange() {},
          setVisibleRange() {},
          subscribeVisibleTimeRangeChange(handler) {
            chartRecord.visibleRangeHandler = handler;
          },
          unsubscribeVisibleTimeRangeChange() {},
        };
      },
      subscribeCrosshairMove() {},
      unsubscribeCrosshairMove() {},
      remove() {},
    };
  },
};

const root = createElement('div');
const primaryHost = createElement('div');
primaryHost.dataset.chartHost = '';
primaryHost.dataset.chartPaneId = 'primary';
const secondaryHost = createElement('div');
secondaryHost.dataset.chartHost = '';
secondaryHost.dataset.chartPaneId = 'secondary';
root.append(primaryHost);
root.append(secondaryHost);

const viewportDemandEvents = [];
const unsubscribeViewportDemand = subscribeEvent(CHART_EVENTS.VIEWPORT_DEMAND, (payload) => {
  viewportDemandEvents.push(payload);
});

const runtime = createChartRuntime();
runtime.start({ root, emitEvent });

assert.equal(charts.length, 2);

await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, {
  paneId: 'primary',
  bars: [bar(30, 100), bar(31, 101), bar(32, 102), bar(33, 103)],
});
await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
  paneId: 'primary',
  instrument: 'NQ',
  displayTimeframe: 1,
  loadedCoverage: {
    from: '2026-06-01T09:30:00.000Z',
    to: '2026-06-01T09:33:00.000Z',
  },
});
await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, {
  paneId: 'secondary',
  bars: [bar(30, 200), bar(35, 205), bar(40, 210)],
});
await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
  paneId: 'secondary',
  instrument: 'NQ',
  displayTimeframe: 5,
  loadedCoverage: {
    from: '2026-06-01T09:30:00.000Z',
    to: '2026-06-01T09:40:00.000Z',
  },
});

const secondaryManualRange = await dispatchCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE, {
  paneId: 'secondary',
  from: Date.parse('2026-06-01T09:20:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:35:00.000Z') / 1000,
});
assert.equal(secondaryManualRange.viewportDemand?.paneId, 'secondary');

assert.equal(viewportDemandEvents.at(-1).viewportDemand.paneId, 'secondary');
assert.equal(viewportDemandEvents.at(-1).viewportDemand.displayTimeframe, 5);
assert.equal(viewportDemandEvents.at(-1).viewportDemand.missingWindow.anchor, '2026-06-01T09:30:00.000Z');
const secondarySetDataCountAfterManualRange = charts[1].setDataCalls.length;

await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, {
  paneId: 'primary',
  bars: [bar(30, 110), bar(31, 111), bar(32, 112), bar(33, 113), bar(34, 114)],
});
assert.equal(
  charts[1].setDataCalls.length,
  secondarySetDataCountAfterManualRange,
  'primary replay updates should not rewrite a pane-local secondary chart'
);

runtime.stop();
unsubscribeViewportDemand();
delete globalThis.LightweightCharts;
delete globalThis.MutationObserver;
delete globalThis.document;

console.log('v5 chart runtime pane-local viewport smoke passed');
