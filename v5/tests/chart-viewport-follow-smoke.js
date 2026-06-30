import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, hasCommand } from '../src/runtime/commands.js';
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
    title: '',
    textContent: '',
    isConnected: true,
    clientWidth: 60,
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

const root = createElement('div');
const host = createElement('div');
host.dataset.chartHost = '';
root.append(host);

const runtime = createChartRuntime();
runtime.start({ root });

assert.equal(hasCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW), true);
assert.equal(hasCommand(CHART_COMMANDS.GET_RENDERED_BARS), true);

const bars = [bar(30, 100), bar(31, 101), bar(32, 102), bar(33, 103), bar(34, 104), bar(35, 105)];
const replaced = await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars });
assert.equal(replaced.bars.length, 6);
assert.equal(host.children[0].children[0].dataset.chartBarCount, '6');
assert.equal(host.children[0].children[0].dataset.fullChartBarCount, '6');

const followed = await dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, {
  enabled: true,
  cursorTimestamp: '2026-06-01T09:34:00.000Z',
  estimatedVisibleBars: 4,
  rightOffsetBars: 1,
});
assert.equal(followed.fullBarCount, 6);
assert.deepEqual(
  followed.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:32:00.000Z',
    '2026-06-01T09:33:00.000Z',
    '2026-06-01T09:34:00.000Z',
  ]
);
assert.equal(host.children[0].dataset.viewportFollow, 'true');
assert.equal(host.children[0].dataset.renderedBarCount, '3');
assert.equal(host.children[0].dataset.fullBarCount, '6');
assert.equal(host.children[0].children[0].dataset.chartBarCount, '3');
assert.equal(host.children[0].children[0].dataset.fullChartBarCount, '6');
assert.equal(host.children[0].children[0].children[0].title, '2026-06-01 09:32 O:102 H:103 L:101 C:102.5');

const advanced = await dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, {
  cursorTimestamp: '2026-06-01T09:35:00.000Z',
});
assert.deepEqual(
  advanced.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:33:00.000Z',
    '2026-06-01T09:34:00.000Z',
    '2026-06-01T09:35:00.000Z',
  ]
);

const disabled = await dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, { enabled: false });
assert.equal(disabled.renderedBars.length, 6);
assert.equal(host.children[0].dataset.viewportFollow, 'false');
assert.equal(host.children[0].children[0].dataset.chartBarCount, '6');

runtime.stop();

console.log('v5 chart viewport follow smoke passed');
