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

const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
const timers = new Map();
let nextTimerId = 1;
globalThis.setInterval = (callback, intervalMs) => {
  const timerId = nextTimerId;
  nextTimerId += 1;
  timers.set(timerId, { callback, intervalMs, cleared: false });
  return timerId;
};
globalThis.clearInterval = (timerId) => {
  const timer = timers.get(timerId);
  if (timer) timer.cleared = true;
};

clearCommandsForTest();
clearEventsForTest();

const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    if (window.direction === 'forward') {
      if (window.anchor === '2026-06-01T09:30:00.000Z') {
        return { bars: [bar('2026-06-01T09:30:00.000Z', 100), bar('2026-06-01T09:31:00.000Z', 101)] };
      }
      if (window.anchor === '2026-06-01T09:31:00.000Z') {
        return { bars: [bar('2026-06-01T09:31:00.000Z', 101), bar('2026-06-01T09:32:00.000Z', 102)] };
      }
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

try {
  barDataRuntime.start();
  sessionRuntime.start();
  const unregisterMetrics = registerCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, () => ({
    width: 30,
    height: 420,
    estimatedVisibleBars: 3,
    mounted: true,
  }));
  const unregisterReplace = registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars } = {}) => ({ bars }));
  replayRuntime.start();

  const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
    id: 'replay-cursor-persistence-test',
    instrument: 'NQ',
    timeframe: 1,
    sessionStart: '2026-06-01 09:30',
    sessionEnd: '2026-06-01 09:32',
  });
  await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
    sessionId: created.session.id,
  });

  await dispatchCommand(REPLAY_COMMANDS.NEXT, {
    sessionId: created.session.id,
  });
  let fetched = await dispatchCommand(SESSION_COMMANDS.GET, {
    sessionId: created.session.id,
  });
  assert.equal(fetched.cursor.startBarTimestamp, '2026-06-01T09:30:00.000Z');
  assert.equal(fetched.cursor.cursorTimestamp, '2026-06-01T09:31:00.000Z');
  assert.equal(fetched.cursor.revealedCount, 1);

  await dispatchCommand(REPLAY_COMMANDS.PLAY, {
    sessionId: created.session.id,
    intervalMs: 25,
  });
  await timers.get(1).callback();
  fetched = await dispatchCommand(SESSION_COMMANDS.GET, {
    sessionId: created.session.id,
  });
  assert.equal(fetched.cursor.cursorTimestamp, '2026-06-01T09:32:00.000Z');
  assert.equal(fetched.cursor.revealedCount, 2);

  replayRuntime.stop();
  unregisterReplace();
  unregisterMetrics();
  sessionRuntime.stop();
  barDataRuntime.stop();
} finally {
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
}

console.log('v5 replay cursor persistence smoke passed');
