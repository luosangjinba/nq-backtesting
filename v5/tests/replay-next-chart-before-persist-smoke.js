import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS } from '../src/runtime/chart-runtime.js';
import { REPLAY_COMMANDS, createReplayRuntime } from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS } from '../src/contracts/session-contracts.js';

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

const session = {
  id: 'replay-next-chart-before-persist',
  userId: 'default-user',
  workspaceId: 'default-workspace',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01T09:30:00.000Z',
  sessionEnd: '2026-06-01T09:40:00.000Z',
  status: 'ready',
  createdAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
};
let cursor = {
  sessionId: session.id,
  startBarTimestamp: null,
  cursorTimestamp: null,
  revealedCount: 0,
};
let resolvePersist = null;
let persistStarted = null;
const persistStartedPromise = new Promise((resolve) => {
  persistStarted = resolve;
});

const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
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
const replayRuntime = createReplayRuntime();
let chartBars = [];

barDataRuntime.start();
const unregisterGet = registerCommand(SESSION_COMMANDS.GET, () => ({ session, cursor }));
const unregisterUpdate = registerCommand(SESSION_COMMANDS.UPDATE_CURSOR, async (payload) => {
  persistStarted(payload);
  await new Promise((resolve) => {
    resolvePersist = resolve;
  });
  cursor = {
    ...cursor,
    ...payload,
    updatedAt: '2026-07-02T00:01:00.000Z',
  };
  return { session, cursor };
});
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
const unregisterRightEdge = registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, ({ rightEdge } = {}) => ({ rightEdge }));
const unregisterDisplayContext = registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload = {}) => ({
  displayContext: payload,
}));
replayRuntime.start();

const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: session.id,
});
assert.equal(initial.displayBars.length, 3);

const nextPromise = dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: session.id,
});
await persistStartedPromise;
assert.equal(
  chartBars.length,
  initial.displayBars.length + 1,
  'chart should render the next bar before cursor persistence resolves'
);
let stateWhilePersisting = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(stateWhilePersisting.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(stateWhilePersisting.persistedCursor.cursorTimestamp, null);

resolvePersist();
const next = await nextPromise;
assert.equal(next.advanced, true);
assert.equal(next.persistedCursor.cursorTimestamp, '2026-06-01T09:31:00.000Z');

replayRuntime.stop();
unregisterDisplayContext();
unregisterRightEdge();
unregisterReplace();
unregisterMetrics();
unregisterUpdate();
unregisterGet();
barDataRuntime.stop();

console.log('v5 replay next chart before persist smoke passed');
