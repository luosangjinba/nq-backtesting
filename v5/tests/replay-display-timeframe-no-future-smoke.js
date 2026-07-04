import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS } from '../src/runtime/chart-runtime.js';
import {
  REPLAY_COMMANDS,
  createReplayRuntime,
  isDisplayBarAllowed,
} from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';
import {
  shouldSeekEarlierDisplayWindow,
} from '../src/runtime/replay-runtime-state.js';

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

assert.equal(
  isDisplayBarAllowed(bar('2026-06-01T09:30:00.000Z', 100), {
    cursorTimestamp: '2026-06-01T09:31:00.000Z',
    replayTimeframe: 1,
    displayTimeframe: 5,
  }),
  false,
  'unfinished higher-timeframe bar must not be visible'
);
assert.equal(
  isDisplayBarAllowed(bar('2026-06-01T09:25:00.000Z', 100), {
    cursorTimestamp: '2026-06-01T09:31:00.000Z',
    replayTimeframe: 1,
    displayTimeframe: 5,
  }),
  true,
  'completed higher-timeframe bar may be visible'
);
assert.equal(
  shouldSeekEarlierDisplayWindow({
    direction: 'backward',
    attempt: 0,
    displayTimeframe: 5,
    replayTimeframe: 1,
    windowDisplayBars: [],
  }),
  true,
  'empty higher-timeframe window should seek earlier while bounded'
);

clearCommandsForTest();
clearEventsForTest();

let chartBars = [];
const fiveMinuteRequests = [];
const startTimestamp = timestamp('2026-06-01T09:30:00.000Z');
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    if (window.direction === 'forward') {
      if (window.timeframe === 1 && window.anchor === '2026-06-01T09:31:00.000Z') {
        return {
          bars: [
            bar('2026-06-01T09:31:00.000Z', 101),
            bar('2026-06-01T09:32:00.000Z', 102),
          ],
        };
      }
      return {
        bars: [
          bar('2026-06-01T09:30:00.000Z', 100),
          bar('2026-06-01T09:31:00.000Z', 101),
        ],
      };
    }
    if (window.timeframe === 5) {
      fiveMinuteRequests.push(window.anchor);
      if (window.anchor === '2026-06-01T09:30:00.000Z') {
        return {
          bars: [
            bar('2026-06-01T09:30:00.000Z', 83),
          ],
        };
      }
      return {
        bars: [
          bar('2026-06-01T09:10:00.000Z', 79),
          bar('2026-06-01T09:15:00.000Z', 80),
          bar('2026-06-01T09:20:00.000Z', 81),
          bar('2026-06-01T09:25:00.000Z', 82),
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
  chartBars = bars;
  return { bars };
});
const unregisterRightEdge = registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, ({ rightEdge } = {}) => ({ rightEdge }));
const unregisterDisplayContext = registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload = {}) => ({
  displayContext: payload,
}));
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-display-no-future-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:35',
});
await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
const next = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(next.cursorTimestamp, '2026-06-01T09:31:00.000Z');

const display5m = await dispatchCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
  sessionId: created.session.id,
  displayTimeframe: 5,
  count: 4,
});
assert.equal(display5m.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.deepEqual(
  display5m.displayBars.map((entry) => entry.timestamp),
  [
    timestamp('2026-06-01T09:10:00.000Z'),
    timestamp('2026-06-01T09:15:00.000Z'),
    timestamp('2026-06-01T09:20:00.000Z'),
    timestamp('2026-06-01T09:25:00.000Z'),
  ]
);
assert.deepEqual(
  fiveMinuteRequests,
  [
    '2026-06-01T09:30:00.000Z',
    '2026-06-01T09:10:00.000Z',
  ],
  'higher timeframe load should seek earlier after an unfinished-only window'
);
assert.equal(
  display5m.displayBars.some((entry) => entry.timestamp === startTimestamp),
  false,
  '09:30 5m bar ends after 09:31 cursor and must not render'
);
assert.deepEqual(chartBars, display5m.displayBars);

replayRuntime.stop();
unregisterDisplayContext();
unregisterRightEdge();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay display timeframe no-future smoke passed');
