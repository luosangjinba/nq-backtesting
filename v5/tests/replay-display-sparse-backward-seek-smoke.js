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

let chartBars = [];
const barRequests = [];
const sessionRuntime = createSessionRuntime(createSessionRepository());
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
    if (window.anchor === '2026-06-01T09:30:00.000Z') {
      return {
        bars: [
          bar('2026-06-01T09:27:00.000Z', 97),
          bar('2026-06-01T09:28:00.000Z', 98),
          bar('2026-06-01T09:29:00.000Z', 99),
          bar('2026-06-01T09:30:00.000Z', 100),
        ],
      };
    }
    if (window.anchor === '2026-06-01T09:27:00.000Z') {
      return {
        bars: [
          bar('2026-06-01T09:20:00.000Z', 90),
          bar('2026-06-01T09:27:00.000Z', 97),
        ],
      };
    }
    return {
      bars: [
        bar('2026-06-01T01:05:00.000Z', 80),
        bar('2026-06-01T01:06:00.000Z', 81),
      ],
    };
  },
});
const replayRuntime = createReplayRuntime();

sessionRuntime.start();
barDataRuntime.start();
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
  id: 'replay-display-sparse-backward-seek-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-05 16:00',
});
await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});

const loaded = await dispatchCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, {
  sessionId: created.session.id,
  viewportDemand: {
    instrument: 'NQ',
    displayTimeframe: 1,
    direction: 'backward',
    visibleFrom: timestamp('2026-06-01T01:04:00.000Z'),
    visibleTo: timestamp('2026-06-01T09:29:00.000Z'),
    loadedCoverage: {
      from: timestamp('2026-06-01T09:27:00.000Z'),
      to: timestamp('2026-06-01T09:30:00.000Z'),
    },
    missingWindow: {
      direction: 'backward',
      anchor: '2026-06-01T09:27:00.000Z',
      from: timestamp('2026-06-01T01:04:00.000Z'),
      to: timestamp('2026-06-01T09:27:00.000Z'),
      suggestedCount: 499,
    },
  },
});

assert.equal(loaded.displayWindow.seekAttempts, 1);
assert.equal(loaded.displayWindow.attempts.length, 2);
assert.deepEqual(
  loaded.displayBars.map((entry) => entry.timestamp),
  [
    timestamp('2026-06-01T01:05:00.000Z'),
    timestamp('2026-06-01T01:06:00.000Z'),
    timestamp('2026-06-01T09:20:00.000Z'),
    timestamp('2026-06-01T09:27:00.000Z'),
    timestamp('2026-06-01T09:28:00.000Z'),
    timestamp('2026-06-01T09:29:00.000Z'),
    timestamp('2026-06-01T09:30:00.000Z'),
  ]
);
assert.deepEqual(chartBars, loaded.displayBars);
assert.equal(barRequests.at(-2).anchor, '2026-06-01T09:27:00.000Z');
assert.equal(barRequests.at(-1).direction, 'backward');
assert.notEqual(barRequests.at(-1).anchor, '2026-06-01T09:27:00.000Z');

replayRuntime.stop();
unregisterDisplayContext();
unregisterRightEdge();
unregisterReplace();
unregisterMetrics();
barDataRuntime.stop();
sessionRuntime.stop();

console.log('v5 replay display sparse backward seek smoke passed');
