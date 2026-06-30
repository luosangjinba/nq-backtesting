import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { CHART_COMMANDS, createChartRuntime } from '../src/runtime/chart-runtime.js';

function createElement(tagName) {
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
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

const engineCalls = {
  setData: [],
  visibleRangeHandler: null,
  removed: 0,
};
globalThis.LightweightCharts = {
  createChart() {
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

runtime.stop();
assert.equal(engineCalls.removed, 1);
delete globalThis.LightweightCharts;

console.log('v5 chart runtime engine adapter smoke passed');
