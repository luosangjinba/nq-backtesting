import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { CHART_COMMANDS, CHART_EVENTS, createChartRuntime } from '../src/runtime/chart-runtime.js';

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
    clientWidth: 120,
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

function timestamp(value) {
  return Date.parse(value) / 1000;
}

function iso(timestampSecondsValue) {
  return new Date(timestampSecondsValue * 1000).toISOString();
}

function bar(timestampSecondsValue, open) {
  return {
    time: iso(timestampSecondsValue),
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

const prefixDemandEvents = [];
const unsubscribeDemand = subscribeEvent(CHART_EVENTS.PREFIX_DEMAND, (payload) => {
  prefixDemandEvents.push(payload);
});

const runtime = createChartRuntime();
runtime.start({ root, emitEvent });

const startTimestamp = timestamp('2026-06-01T09:30:00.000Z');
await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, {
  bars: Array.from({ length: 5 }, (_, index) => bar(startTimestamp + (index * 60), 100 + index)),
});

const normalRange = await dispatchCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, {
  from: startTimestamp + 180,
  to: startTimestamp + 240,
});
assert.equal(normalRange.prefixDemand, null);
assert.equal(prefixDemandEvents.length, 0);
assert.equal((await dispatchCommand(CHART_COMMANDS.GET_PREFIX_DEMAND)).prefixDemand, null);

const leftDemand = await dispatchCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, {
  from: startTimestamp + 60,
  to: startTimestamp + 180,
});
assert.equal(leftDemand.prefixDemand.direction, 'backward');
assert.equal(leftDemand.prefixDemand.anchor, '2026-06-01T09:30:00.000Z');
assert.equal(leftDemand.prefixDemand.earliestLoadedTimestamp, startTimestamp);
assert.equal(leftDemand.prefixDemand.visibleFrom, startTimestamp + 60);
assert.equal(leftDemand.prefixDemand.thresholdSeconds, 120);
assert.equal(leftDemand.prefixDemand.suggestedCount, 3);
assert.equal(prefixDemandEvents.length, 1);

const currentDemand = await dispatchCommand(CHART_COMMANDS.GET_PREFIX_DEMAND);
assert.deepEqual(currentDemand.prefixDemand, leftDemand.prefixDemand);

runtime.stop();
unsubscribeDemand();

console.log('v5 prefix demand detect smoke passed');
