import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS } from '../src/runtime/chart-runtime.js';
import { REPLAY_COMMANDS, createReplayRuntime } from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

function timestamp(value) {
  return Date.parse(value) / 1000;
}

function bar(value, open) {
  return {
    timestamp: timestamp(value),
    open,
    high: open + 1,
    low: open - 1,
    close: open + 0.5,
  };
}

function makeBarsFromWindow(window, firstOpen = 100) {
  const startTimestamp = timestamp(`${window.start}:00.000Z`.replace(' ', 'T'));
  return Array.from({ length: window.estimatedBars }, (_, index) => ({
    timestamp: startTimestamp + (index * Number(window.timeframe) * 60),
    open: firstOpen + index,
    high: firstOpen + index + 1,
    low: firstOpen + index - 1,
    close: firstOpen + index + 0.5,
  }));
}

clearCommandsForTest();
clearEventsForTest();

let chartBars = [];
const barRequests = [];
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    barRequests.push(window);
    if (window.direction === 'forward') {
      return { bars: makeBarsFromWindow(window, 100) };
    }
    return {
      bars: [
        bar('2026-06-01T09:28:00.000Z', 98),
        bar('2026-06-01T09:29:00.000Z', 99),
        bar('2026-06-01T09:30:00.000Z', 100),
      ],
    };
  },
});
const sessionRuntime = createSessionRuntime(createSessionRepository());
const replayRuntime = createReplayRuntime();

barDataRuntime.start();
sessionRuntime.start();
const unregisterMetrics = registerCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, () => ({
  width: 30,
  height: 420,
  estimatedVisibleBars: 3,
  mounted: true,
}));
const unregisterReplace = registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars } = {}) => {
  chartBars = bars;
  return { bars };
});
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-next-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:32',
});
const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(initial.displayBars.length, 3);
const initialState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.deepEqual(initialState.countdown, {
  active: true,
  remainingSeconds: 60,
  closeTimestamp: '2026-06-01T09:31:00.000Z',
  label: '1:00',
});
const forwardRequestsAfterInitial = barRequests.filter((request) => request.direction === 'forward').length;

const firstNext = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
  stepCount: 2,
});
assert.equal(firstNext.advanced, true);
assert.equal(firstNext.revealedBar.timestamp, timestamp('2026-06-01T09:32:00.000Z'));
assert.equal(firstNext.displayBars.length, initial.displayBars.length + 2);
assert.equal(firstNext.cursorTimestamp, '2026-06-01T09:32:00.000Z');
assert.equal(chartBars.length, firstNext.displayBars.length);
assert.deepEqual(
  firstNext.displayBars.slice(initial.displayBars.length).map((item) => item.timestamp),
  [timestamp('2026-06-01T09:31:00.000Z'), timestamp('2026-06-01T09:32:00.000Z')]
);
assert.equal(
  barRequests.filter((request) => request.direction === 'forward').length - forwardRequestsAfterInitial,
  0,
  'stepCount should reuse the initial forward reveal window instead of fetching once per bar'
);
const endState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.deepEqual(endState.countdown, {
  active: false,
  remainingSeconds: 0,
  closeTimestamp: '2026-06-01T09:32:00.000Z',
  label: '0:00',
});

const secondNext = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(secondNext.advanced, false);
assert.equal(secondNext.reason, 'session-end');
assert.equal(secondNext.displayBars.length, firstNext.displayBars.length);
assert.equal(chartBars.length, firstNext.displayBars.length);
assert.equal(
  barRequests.filter((request) => request.direction === 'forward').length - forwardRequestsAfterInitial,
  0,
  'session-end checks should not request another forward window after cursor reaches the end'
);

replayRuntime.stop();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay next smoke passed');
