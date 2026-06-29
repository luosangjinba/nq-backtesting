import assert from 'node:assert/strict';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS } from '../src/runtime/chart-runtime.js';
import {
  REPLAY_COMMANDS,
  computePrefixBarCount,
  createReplayRuntime,
} from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

function timestamp(value) {
  return Date.parse(value) / 1000;
}

clearCommandsForTest();
clearEventsForTest();

const barRequests = [];
const sessionRuntime = createSessionRuntime(createSessionRepository());
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    barRequests.push(window);
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
        { timestamp: timestamp('2026-06-01T09:27:00.000Z'), open: 97, high: 98, low: 96, close: 97.5 },
        { timestamp: timestamp('2026-06-01T09:28:00.000Z'), open: 98, high: 99, low: 97, close: 98.5 },
        { timestamp: timestamp('2026-06-01T09:29:00.000Z'), open: 99, high: 100, low: 98, close: 99.5 },
        { timestamp: timestamp('2026-06-01T09:30:00.000Z'), open: 100, high: 101, low: 99, close: 100.5 },
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
replayRuntime.start();

assert.equal(computePrefixBarCount({ estimatedVisibleBars: 4 }), 3);
assert.equal(computePrefixBarCount({ estimatedVisibleBars: 0 }), 119);
assert.equal(computePrefixBarCount({ estimatedVisibleBars: 900 }), 499);

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-prefix-load-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01T09:30:00.000Z',
  sessionEnd: '2026-06-01T10:00:00.000Z',
});
const state = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_PREFIX, {
  sessionId: created.session.id,
});

assert.equal(state.status, 'prefix-loaded');
assert.equal(state.prefixBars.length, 3);
assert.deepEqual(
  state.prefixBars.map((bar) => bar.timestamp),
  [
    timestamp('2026-06-01T09:27:00.000Z'),
    timestamp('2026-06-01T09:28:00.000Z'),
    timestamp('2026-06-01T09:29:00.000Z'),
  ]
);
assert.equal(barRequests.length, 2);
assert.equal(barRequests[1].direction, 'backward');
assert.equal(barRequests[1].estimatedBars, 4);
assert.equal(barRequests[1].start, '2026-06-01 09:27');
assert.equal(barRequests[1].end, '2026-06-01 09:30');
assert.deepEqual(state.viewportMetrics, {
  width: 40,
  height: 420,
  estimatedVisibleBars: 4,
  mounted: true,
});

replayRuntime.stop();
unregisterMetrics();
barDataRuntime.stop();
sessionRuntime.stop();

console.log('v5 replay prefix load smoke passed');
