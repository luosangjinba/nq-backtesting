import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS } from '../src/runtime/chart-runtime.js';
import {
  REPLAY_COMMANDS,
  assertNoFutureDisplayBars,
  createReplayRuntime,
} from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

function timestamp(value) {
  return Date.parse(value) / 1000;
}

clearCommandsForTest();
clearEventsForTest();

let chartBars = null;
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    if (window.direction === 'forward') {
      return {
        bars: [
          { timestamp: timestamp('2026-06-01T09:30:00.000Z'), open: 100, high: 101, low: 99, close: 100.5 },
          { timestamp: timestamp('2026-06-01T09:31:00.000Z'), open: 101, high: 102, low: 100, close: 101.5 },
        ],
      };
    }
    return {
      bars: [
        { timestamp: timestamp('2026-06-01T09:28:00.000Z'), open: 98, high: 99, low: 97, close: 98.5 },
        { timestamp: timestamp('2026-06-01T09:29:00.000Z'), open: 99, high: 100, low: 98, close: 99.5 },
        { timestamp: timestamp('2026-06-01T09:30:00.000Z'), open: 100, high: 101, low: 99, close: 100.5 },
        { timestamp: timestamp('2026-06-01T09:31:00.000Z'), open: 101, high: 102, low: 100, close: 101.5 },
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
  id: 'replay-no-future-bars-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01T09:30:00.000Z',
  sessionEnd: '2026-06-01T10:00:00.000Z',
});
const state = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});

assert.deepEqual(
  state.displayBars.map((bar) => bar.timestamp),
  [
    timestamp('2026-06-01T09:28:00.000Z'),
    timestamp('2026-06-01T09:29:00.000Z'),
    timestamp('2026-06-01T09:30:00.000Z'),
  ]
);
assert.equal(state.displayBars.some((bar) => bar.timestamp > state.startBar.timestamp), false);
assert.deepEqual(chartBars.map((bar) => bar.timestamp), state.displayBars.map((bar) => bar.timestamp));
assert.throws(
  () => assertNoFutureDisplayBars([
    state.startBar,
    { ...state.startBar, timestamp: state.startBar.timestamp + 60 },
  ], state.startBar),
  /must not include future bars/
);

replayRuntime.stop();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay no future bars smoke passed');
