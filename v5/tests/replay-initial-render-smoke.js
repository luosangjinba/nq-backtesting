import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { createChartRuntime } from '../src/runtime/chart-runtime.js';
import { REPLAY_COMMANDS, createReplayRuntime } from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

function timestamp(value) {
  return Date.parse(value) / 1000;
}

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
    clientWidth: 40,
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

const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    if (window.direction === 'forward') {
      return {
        bars: [
          { timestamp: timestamp('2026-06-01T09:30:00.000Z'), open: 100, high: 101, low: 99, close: 100.5 },
          { timestamp: timestamp('2026-06-01T09:31:00.000Z'), open: 101, high: 102, low: 100, close: 101.5 },
        ],
      };
    }
    return {
      bars: [
        { timestamp: timestamp('2026-06-01T09:27:00.000Z'), open: 97, high: 98, low: 96, close: 97.5 },
        { timestamp: timestamp('2026-06-01T09:28:00.000Z'), open: 98, high: 99, low: 97, close: 98.5 },
        { timestamp: timestamp('2026-06-01T09:29:00.000Z'), open: 99, high: 100, low: 98, close: 99.5 },
        { timestamp: timestamp('2026-06-01T09:30:00.000Z'), open: 100, high: 101, low: 99, close: 100.5 },
      ],
    };
  },
});
const chartRuntime = createChartRuntime();
const replayRuntime = createReplayRuntime();
const sessionRuntime = createSessionRuntime(createSessionRepository());

let changedEvent = null;
const unsubscribe = subscribeEvent('chart:barsChanged', (payload) => {
  changedEvent = payload;
});
chartRuntime.start({ root, emitEvent });
barDataRuntime.start();
sessionRuntime.start();
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-initial-render-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01T09:30:00.000Z',
  sessionEnd: '2026-06-01T10:00:00.000Z',
});
const state = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});

assert.equal(state.status, 'initial-loaded');
assert.equal(state.displayBars.length, 4);
assert.equal(state.displayBars.at(-1).timestamp, state.startBar.timestamp);
assert.equal(host.children[0].children[0].dataset.chartBarCount, '4');
assert.equal(changedEvent.bars.length, 4);

replayRuntime.stop();
sessionRuntime.stop();
barDataRuntime.stop();
chartRuntime.stop();
unsubscribe();

console.log('v5 replay initial render smoke passed');
