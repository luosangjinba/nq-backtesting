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

clearCommandsForTest();
clearEventsForTest();

const chartReplaces = [];
const followUpdates = [];
const barRequests = [];
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    barRequests.push(window);
    if (window.direction === 'forward') {
      return {
        bars: [
          bar(window.anchor, 200),
          bar('2026-06-01T09:31:00.000Z', 201),
          bar('2026-06-01T09:32:00.000Z', 202),
        ],
      };
    }
    return {
      bars: [
        bar('2026-06-01T09:27:00.000Z', 97),
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
  chartReplaces.push(bars);
  return { bars };
});
const unregisterRightEdge = registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, ({ rightEdge } = {}) => ({
  rightEdgeLimit: timestamp(rightEdge),
}));
const unregisterDisplayContext = registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, () => ({}));
const unregisterFollow = registerCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, (payload = {}) => {
  followUpdates.push(payload);
  return {
    viewportFollow: payload,
    renderedBars: chartReplaces.at(-1)?.slice(-3) || [],
    fullBarCount: chartReplaces.at(-1)?.length || 0,
  };
});
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-viewport-follow-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:32',
});
const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(initial.displayBars.length, 4);
assert.equal(followUpdates.at(-1).enabled, true);
assert.equal(followUpdates.at(-1).cursorTimestamp, '2026-06-01T09:30:00.000Z');
assert.equal(followUpdates.at(-1).estimatedVisibleBars, 4);

const next = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(next.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(next.displayBars.length, 5);
assert.equal(chartReplaces.at(-1).length, 5);
assert.equal(followUpdates.at(-1).cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(followUpdates.at(-1).estimatedVisibleBars, 4);
assert.equal(barRequests.length, 2);

const reset = await dispatchCommand(REPLAY_COMMANDS.RESET, {
  sessionId: created.session.id,
});
assert.equal(reset.cursorTimestamp, '2026-06-01T09:30:00.000Z');
assert.equal(followUpdates.at(-1).cursorTimestamp, '2026-06-01T09:30:00.000Z');

replayRuntime.stop();
unregisterFollow();
unregisterDisplayContext();
unregisterRightEdge();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay viewport follow smoke passed');
