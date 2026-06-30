import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, hasCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { BAR_DATA_COMMANDS } from '../src/contracts/bar-data-contracts.js';
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

const viewportDemandEvents = [];
const chartRuntime = createChartRuntime();
chartRuntime.start({
  root,
  emitEvent: (name, payload) => {
    if (name === CHART_EVENTS.VIEWPORT_DEMAND) {
      viewportDemandEvents.push(payload);
    }
  },
});

assert.equal(hasCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT), true);
assert.equal(hasCommand(CHART_COMMANDS.GET_VIEWPORT_DEMAND), true);
assert.equal(hasCommand(BAR_DATA_COMMANDS.LOAD_WINDOW), false);

const startTimestamp = timestamp('2026-06-01T09:30:00.000Z');
const bars = [
  bar(startTimestamp, 100),
  bar(startTimestamp + 60, 101),
  bar(startTimestamp + 120, 102),
  bar(startTimestamp + 180, 103),
];

let context = await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
  instrument: 'NQ',
  displayTimeframe: 1,
});
assert.deepEqual(context.displayContext, {
  instrument: 'NQ',
  displayTimeframe: 1,
  loadedCoverage: null,
  displayTimezone: 'Exchange',
  exchangeTimezone: 'America/New_York',
});
assert.equal(context.viewportDemand, null);

await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars });

const normalRange = await dispatchCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, {
  from: startTimestamp + 180,
  to: startTimestamp + 300,
});
assert.equal(normalRange.viewportDemand, null);
assert.equal(viewportDemandEvents.length, 0);

const leftRange = await dispatchCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, {
  from: startTimestamp - 60,
  to: startTimestamp + 60,
});
assert.equal(leftRange.viewportDemand.instrument, 'NQ');
assert.equal(leftRange.viewportDemand.displayTimeframe, 1);
assert.equal(leftRange.viewportDemand.direction, 'backward');
assert.deepEqual(leftRange.viewportDemand.loadedCoverage, {
  from: startTimestamp,
  to: startTimestamp + 180,
});
assert.deepEqual(leftRange.viewportDemand.missingWindow, {
  direction: 'backward',
  anchor: '2026-06-01T09:30:00.000Z',
  from: startTimestamp - 60,
  to: startTimestamp,
  suggestedCount: 4,
});
assert.equal(viewportDemandEvents.length, 1);
assert.deepEqual(viewportDemandEvents[0].viewportDemand, leftRange.viewportDemand);

const currentDemand = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_DEMAND);
assert.deepEqual(currentDemand.viewportDemand, leftRange.viewportDemand);

context = await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
  instrument: 'NQ',
  displayTimeframe: 5,
  loadedCoverage: {
    from: '2026-06-01T09:25:00.000Z',
    to: '2026-06-01T09:40:00.000Z',
  },
});
assert.equal(context.displayContext.displayTimeframe, 5);
assert.deepEqual(context.displayContext.loadedCoverage, {
  from: timestamp('2026-06-01T09:25:00.000Z'),
  to: timestamp('2026-06-01T09:40:00.000Z'),
});

chartRuntime.stop();

console.log('v5 replay display viewport demand smoke passed');
