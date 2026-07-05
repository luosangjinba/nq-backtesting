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

function makeBars(startText, endText, timeframe) {
  const stepSeconds = Number(timeframe) * 60;
  const start = Date.parse(`${startText.replace(' ', 'T')}:00.000Z`) / 1000;
  const end = Date.parse(`${endText.replace(' ', 'T')}:00.000Z`) / 1000;
  const bars = [];
  for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
    const open = 100 + Math.round((timestamp - start) / stepSeconds);
    bars.push({
      timestamp,
      open,
      high: open + 1,
      low: open - 1,
      close: open + 0.5,
    });
  }
  return bars;
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
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    requests.push(window);
    return {
      bars: makeBars(window.start, window.end, window.timeframe),
    };
  },
});
const chartRuntime = createChartRuntime();
const sessionRuntime = createSessionRuntime(createSessionRepository());
const replayRuntime = createReplayRuntime();

chartRuntime.start({ root, emitEvent });
barDataRuntime.start();
sessionRuntime.start();
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-manual-viewport-follow',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:35',
});
const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(initial.cursorTimestamp, '2026-06-01T09:30:00.000Z');
assert.equal(initial.displayBars.at(-1).timestamp, Date.parse('2026-06-01T09:30:00.000Z') / 1000);

const manual = await dispatchCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE, {
  from: '2026-06-01T09:27:00.000Z',
  to: '2026-06-01T09:30:00.000Z',
});
assert.equal(manual.interaction.mode, 'manual');
assert.equal(manual.viewportFollow.enabled, false);
assert.deepEqual(
  manual.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:27:00.000Z',
    '2026-06-01T09:28:00.000Z',
    '2026-06-01T09:29:00.000Z',
    '2026-06-01T09:30:00.000Z',
  ]
);

const requestCountBeforeNext = requests.length;
const next = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(next.advanced, true);
assert.equal(next.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(next.displayBars.length, initial.displayBars.length + 1);
assert.ok(
  requests.length === requestCountBeforeNext || requests.length === requestCountBeforeNext + 1,
  'Next may use cache or request one forward window, but manual follow state must not add requests'
);

const afterNextInteraction = await dispatchCommand(CHART_COMMANDS.GET_INTERACTION_STATE);
assert.equal(afterNextInteraction.interaction.mode, 'follow');
assert.equal(afterNextInteraction.viewportFollow.enabled, true);
assert.equal(afterNextInteraction.visibleRange, null);
assert.ok(afterNextInteraction.fullBarCount >= next.displayBars.length);
assert.equal(afterNextInteraction.renderedBars.at(-1).time, '2026-06-01T09:31:00.000Z');
assert.equal(host.children[0].dataset.interactionMode, 'follow');
assert.equal(host.children[0].dataset.viewportFollow, 'true');

const resumed = await dispatchCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW);
assert.equal(resumed.interaction.mode, 'follow');
assert.equal(resumed.viewportFollow.enabled, true);
assert.equal(resumed.renderedBars.at(-1).time, '2026-06-01T09:31:00.000Z');
assert.equal(host.children[0].dataset.interactionMode, 'follow');

replayRuntime.stop();
sessionRuntime.stop();
barDataRuntime.stop();
chartRuntime.stop();

console.log('v5 replay manual viewport follow smoke passed');
