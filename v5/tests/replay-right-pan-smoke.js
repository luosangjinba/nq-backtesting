import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS, createChartRuntime } from '../src/runtime/chart-runtime.js';
import { REPLAY_COMMANDS, createReplayRuntime } from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

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
    timestamp: timestampSecondsValue,
    open,
    high: open + 1,
    low: open - 1,
    close: open + 0.5,
  };
}

function makeBars(startTimestamp, count, firstOpen = 100) {
  return Array.from({ length: count }, (_, index) => bar(startTimestamp + (index * 60), firstOpen + index));
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

const startTimestamp = timestamp('2026-06-01T09:30:00.000Z');
const forwardBars = makeBars(startTimestamp, 4);
const prefixBars = makeBars(startTimestamp - 120, 3, 90);

const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    if (window.direction === 'forward') {
      return { bars: forwardBars };
    }
    return { bars: prefixBars };
  },
});
const sessionRuntime = createSessionRuntime(createSessionRepository());
const chartRuntime = createChartRuntime();
const replayRuntime = createReplayRuntime();

barDataRuntime.start();
sessionRuntime.start();
chartRuntime.start({ root });
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-right-pan-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:33',
});

const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(initial.cursorTimestamp, '2026-06-01T09:30:00.000Z');

const initialPan = await dispatchCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, {
  from: startTimestamp - 60,
  to: startTimestamp + 240,
});
assert.equal(initialPan.visibleRange.to, startTimestamp);
assert.equal(initialPan.visibleRange.from, startTimestamp - 300);

const next = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(next.cursorTimestamp, '2026-06-01T09:31:00.000Z');

const afterRevealPan = await dispatchCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, {
  from: startTimestamp,
  to: startTimestamp + 240,
});
assert.equal(afterRevealPan.visibleRange.to, startTimestamp + 60);
assert.equal(afterRevealPan.visibleRange.from, startTimestamp - 180);

const rangeState = await dispatchCommand(CHART_COMMANDS.GET_VISIBLE_RANGE);
assert.equal(rangeState.rightEdgeLimit, startTimestamp + 60);
assert.equal(rangeState.visibleRange.to, startTimestamp + 60);

replayRuntime.stop();
chartRuntime.stop();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay right pan smoke passed');
