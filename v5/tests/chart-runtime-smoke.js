import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, hasCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, subscribeEvent } from '../src/runtime/events.js';
import { CHART_COMMANDS, createChartRuntime } from '../src/runtime/chart-runtime.js';

function createElement(tagName) {
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

clearCommandsForTest();
clearEventsForTest();

globalThis.document = { createElement };
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

const root = createElement('div');
const host = createElement('div');
host.dataset.chartHost = '';
root.append(host);

const emitted = [];
const unsubscribe = subscribeEvent('chart:barsChanged', (payload) => {
  emitted.push(payload);
});
const runtime = createChartRuntime();
runtime.start({
  root,
  emitEvent: (name, payload) => {
    if (name === 'chart:barsChanged') {
      emitted.push(payload);
    }
  },
});

assert.equal(hasCommand(CHART_COMMANDS.REPLACE_BARS), true);
assert.equal(hasCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS), true);
assert.equal(host.dataset.chartRuntimeMounted, 'true');
assert.equal(host.children[0].dataset.chartCanvas, 'true');

const metrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS);
assert.deepEqual(metrics, {
  width: 800,
  height: 420,
  estimatedVisibleBars: 80,
  mounted: true,
});

const firstBars = [
  { time: '2026-06-01T09:30:00.000Z', open: 100, high: 104, low: 99, close: 103 },
  { time: '2026-06-01T09:31:00.000Z', open: 103, high: 105, low: 101, close: 102 },
];
const replaced = await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars: firstBars });
assert.equal(replaced.bars.length, 2);
assert.equal(host.children[0].children[0].dataset.chartBarCount, '2');
assert.equal(host.children[0].children[0].children[0].title, '2026-06-01 09:30 O:100 H:104 L:99 C:103');

await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, { displayTimezone: 'UTC' });
assert.equal(host.children[0].children[0].children[0].title, '2026-06-01 13:30 O:100 H:104 L:99 C:103');

const appended = await dispatchCommand(CHART_COMMANDS.APPEND_BARS, {
  bars: [{ time: '2026-06-01T09:32:00.000Z', open: 102, high: 106, low: 102, close: 105 }],
});
assert.equal(appended.bars.length, 3);
assert.equal(host.children[0].children[0].dataset.chartBarCount, '3');

const cleared = await dispatchCommand(CHART_COMMANDS.CLEAR_BARS);
assert.equal(cleared.bars.length, 0);
assert.equal(host.children[0].children[0].className, 'chart-empty-state');
assert.equal(emitted.length, 3);

runtime.stop();
unsubscribe();
assert.equal(hasCommand(CHART_COMMANDS.REPLACE_BARS), false);

console.log('v5 chart runtime smoke passed');
