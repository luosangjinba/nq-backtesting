import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
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
let delayFirstStartLoad = false;
let firstStartLoadArrived = false;
let releaseFirstStartLoad = null;
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    requests.push(window);
    if (
      delayFirstStartLoad
      && window.direction === 'forward'
      && timestamp(window.anchor) === timestamp('2026-06-01T09:30:00.000Z')
      && !firstStartLoadArrived
    ) {
      firstStartLoadArrived = true;
      await new Promise((resolve) => {
        releaseFirstStartLoad = resolve;
      });
    }
    const anchorTimestamp = timestamp(window.anchor);
    if (window.direction === 'forward') {
      return { bars: makeBars(anchorTimestamp, window.estimatedBars) };
    }
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

const first = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-switch-first',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:40',
});
const second = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-switch-second',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 10:00',
  sessionEnd: '2026-06-01 10:10',
});

delayFirstStartLoad = true;
const staleFirstInitial = dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: first.session.id,
});
await waitFor(async () => firstStartLoadArrived && releaseFirstStartLoad);
const concurrentSecondInitial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: second.session.id,
});
delayFirstStartLoad = false;
releaseFirstStartLoad();
await assert.rejects(staleFirstInitial, /Stale replay initial load ignored/);
assert.equal(concurrentSecondInitial.sessionId, second.session.id);
assert.equal((await dispatchCommand(REPLAY_COMMANDS.GET_STATE)).sessionId, second.session.id);

const firstInitial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: first.session.id,
});
await dispatchCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, {
  from: firstInitial.displayBars[0].timestamp,
  to: firstInitial.displayBars[0].timestamp + 60,
});
await waitFor(async () => {
  const state = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  return state.prefixChunks.length === 1;
});

const secondInitial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: second.session.id,
});
assert.equal(secondInitial.sessionId, second.session.id);
assert.equal(secondInitial.prefixChunks.length, 0);
assert.equal(secondInitial.releasedPrefixChunks.length, 0);
assert.equal(
  secondInitial.displayBars.every((entry) => entry.timestamp <= secondInitial.startBar.timestamp),
  true
);
assert.equal(
  requests.some((request) => request.start === '2026-06-01 10:00' && request.end === '2026-06-01 10:10'),
  false
);

replayRuntime.stop();
chartRuntime.stop();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay session switch smoke passed');
