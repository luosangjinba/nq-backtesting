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

function iso(value) {
  return new Date(value * 1000).toISOString();
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

function makeBars(startTimestamp, timeframe, count, firstOpen = 100) {
  return Array.from({ length: count }, (_, index) => ({
    timestamp: startTimestamp + (index * timeframe * 60),
    open: firstOpen + index,
    high: firstOpen + index + 1,
    low: firstOpen + index - 1,
    close: firstOpen + index + 0.5,
  }));
}

clearCommandsForTest();
clearEventsForTest();

let chartBars = [];
let chartDisplayContext = null;
const barRequests = [];
const startTimestamp = timestamp('2026-06-01T09:30:00.000Z');

const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    barRequests.push(window);
    if (window.direction === 'forward') {
      return {
        bars: [
          bar('2026-06-01T09:30:00.000Z', 100),
          bar('2026-06-01T09:31:00.000Z', 101),
        ],
      };
    }
    if (window.timeframe === 5) {
      return { bars: makeBars(startTimestamp - (3 * 5 * 60), 5, 4, 80) };
    }
    if (window.timeframe === 60) {
      return { bars: makeBars(startTimestamp - (60 * 60), 60, 2, 70) };
    }
    return { bars: makeBars(startTimestamp - (3 * 60), 1, 4, 90) };
  },
});
const sessionRuntime = createSessionRuntime(createSessionRepository());
const replayRuntime = createReplayRuntime();

barDataRuntime.start();
sessionRuntime.start();
const unregisterMetrics = registerCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, () => ({
  width: 40,
  height: 420,
  estimatedVisibleBars: 4,
  mounted: true,
}));
const unregisterReplace = registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars } = {}) => {
  chartBars = bars;
  return { bars };
});
const unregisterRightEdge = registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, ({ rightEdge } = {}) => ({ rightEdge }));
const unregisterDisplayContext = registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload = {}) => {
  chartDisplayContext = payload;
  return { displayContext: payload };
});
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-display-timeframe-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:40',
});

const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(initial.replayTimeframe, 1);
assert.equal(initial.displayTimeframe, 1);

let context = await dispatchCommand(REPLAY_COMMANDS.GET_DISPLAY_CONTEXT);
assert.equal(context.replayTimeframe, 1);
assert.equal(context.displayTimeframe, 1);
assert.equal(context.cursorTimestamp, '2026-06-01T09:30:00.000Z');

const display5m = await dispatchCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
  sessionId: created.session.id,
  displayTimeframe: 5,
  count: 4,
});
assert.equal(display5m.displayTimeframe, 5);
assert.deepEqual(
  display5m.displayBars.map((entry) => entry.timestamp),
  [
    timestamp('2026-06-01T09:15:00.000Z'),
    timestamp('2026-06-01T09:20:00.000Z'),
    timestamp('2026-06-01T09:25:00.000Z'),
  ]
);
assert.deepEqual(chartBars, display5m.displayBars);
assert.equal(chartDisplayContext.displayTimeframe, 5);
assert.equal(barRequests.at(-1).timeframe, 5);
assert.equal(barRequests.at(-1).estimatedBars, 4);
assert.notEqual(barRequests.at(-1).start, '2026-06-01 09:30');
assert.notEqual(barRequests.at(-1).end, '2026-06-01 09:40');

const display1h = await dispatchCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
  sessionId: created.session.id,
  displayTimeframe: 60,
  count: 2,
});
assert.equal(display1h.displayTimeframe, 60);
assert.deepEqual(
  display1h.displayBars.map((entry) => iso(entry.timestamp)),
  ['2026-06-01T08:30:00.000Z']
);
assert.equal(barRequests.at(-1).timeframe, 60);

replayRuntime.stop();
unregisterDisplayContext();
unregisterRightEdge();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay display timeframe smoke passed');
