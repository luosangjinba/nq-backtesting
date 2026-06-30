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
const barRequests = [];
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    barRequests.push(window);
    if (window.direction === 'forward' && window.timeframe === 1) {
      if (window.anchor === '2026-06-01T09:30:00.000Z') {
        return {
          bars: [
            bar('2026-06-01T09:30:00.000Z', 100),
            bar('2026-06-01T09:31:00.000Z', 101),
          ],
        };
      }
      if (window.anchor === '2026-06-01T09:31:00.000Z') {
        return {
          bars: [
            bar('2026-06-01T09:31:00.000Z', 101),
            bar('2026-06-01T09:32:00.000Z', 102),
          ],
        };
      }
    }
    if (window.timeframe === 5) {
      return {
        bars: makeBars(timestamp(`${window.start}:00.000Z`.replace(' ', 'T')), 5, window.estimatedBars, 80),
      };
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
const unregisterDisplayContext = registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload = {}) => ({
  displayContext: payload,
}));
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-display-progression-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:32',
});
await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
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

const next = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(next.advanced, true);
assert.equal(next.revealedBar.timestamp, timestamp('2026-06-01T09:31:00.000Z'));
assert.equal(next.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(next.displayTimeframe, 5);
assert.equal(
  next.displayBars.some((entry) => entry.timestamp === timestamp('2026-06-01T09:31:00.000Z')),
  false,
  'Next must not append a 1m replay bar into 5m display bars'
);
assert.deepEqual(
  next.displayBars.map((entry) => entry.timestamp),
  [
    timestamp('2026-06-01T09:15:00.000Z'),
    timestamp('2026-06-01T09:20:00.000Z'),
    timestamp('2026-06-01T09:25:00.000Z'),
  ]
);
assert.deepEqual(chartBars, next.displayBars);
assert.equal(
  barRequests.some((request) =>
    request.timeframe === 5
      && request.start === '2026-06-01 09:30'
      && request.end === '2026-06-01 09:32'
  ),
  false,
  'Display projection must not request the full session range'
);

replayRuntime.stop();
unregisterDisplayContext();
unregisterRightEdge();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay display progression smoke passed');
