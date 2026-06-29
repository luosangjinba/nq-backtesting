import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS, createChartRuntime } from '../src/runtime/chart-runtime.js';
import {
  REPLAY_COMMANDS,
  createReplayRuntime,
  mergeSparseDisplayBars,
} from '../src/runtime/replay-runtime.js';
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
    clientWidth: 50,
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

async function waitFor(predicate) {
  for (let index = 0; index < 20; index += 1) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('condition was not met before timeout');
}

const baseTimestamp = timestamp('2026-06-01T09:30:00.000Z');
const sparseMerged = mergeSparseDisplayBars(
  [bar(baseTimestamp, 100), bar(baseTimestamp + 60, 101)],
  [{ bars: [bar(baseTimestamp - 120, 98), bar(baseTimestamp, 100)] }],
  iso(baseTimestamp + 60)
);
assert.deepEqual(
  sparseMerged.map((entry) => entry.timestamp),
  [baseTimestamp - 120, baseTimestamp, baseTimestamp + 60]
);

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

const requests = [];
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    requests.push(window);
    if (window.direction === 'forward') {
      return { bars: makeBars(baseTimestamp, 2) };
    }
    const anchorTimestamp = timestamp(window.anchor);
    return { bars: makeBars(anchorTimestamp - ((window.estimatedBars - 1) * 60), window.estimatedBars, 80) };
  },
});
const sessionRuntime = createSessionRuntime(createSessionRepository());
const chartRuntime = createChartRuntime();
const replayRuntime = createReplayRuntime();

barDataRuntime.start({ emitEvent });
sessionRuntime.start();
chartRuntime.start({ root, emitEvent });
replayRuntime.start({ emitEvent });

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'prefix-demand-merge-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:40',
});

const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.deepEqual(
  initial.displayBars.map((entry) => entry.timestamp),
  [
    baseTimestamp - 240,
    baseTimestamp - 180,
    baseTimestamp - 120,
    baseTimestamp - 60,
    baseTimestamp,
  ]
);

await dispatchCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, {
  from: initial.displayBars[0].timestamp + 60,
  to: baseTimestamp,
});
await waitFor(async () => {
  const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  return replayState.prefixChunks.length === 1 && replayState.displayBars.length === 7;
});

const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.deepEqual(
  replayState.displayBars.map((entry) => entry.timestamp),
  [
    baseTimestamp - 360,
    baseTimestamp - 300,
    baseTimestamp - 240,
    baseTimestamp - 180,
    baseTimestamp - 120,
    baseTimestamp - 60,
    baseTimestamp,
  ]
);
assert.equal(host.children[0].children[0].dataset.chartBarCount, '7');
assert.equal(requests.length, 3);

replayRuntime.stop();
chartRuntime.stop();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 prefix demand merge smoke passed');
