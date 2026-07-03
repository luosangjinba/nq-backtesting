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

let chartBars = [];
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
  const unregisterReplace = registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars } = {}) => {
    chartBars = bars;
    return { bars };
  });
  replayRuntime.start();

  const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
    id: 'replay-play-test',
    instrument: 'NQ',
    timeframe: 1,
    sessionStart: '2026-06-01 09:30',
    sessionEnd: '2026-06-01 09:32',
  });
  await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
    sessionId: created.session.id,
  });

  const playing = await dispatchCommand(REPLAY_COMMANDS.PLAY, {
    sessionId: created.session.id,
    intervalMs: 25,
    stepCount: 1,
  });
  assert.deepEqual(playing, { playing: true, intervalMs: 25, stepCount: 1, stoppedReason: null });
  assert.equal(timers.size, 1);

  const duplicate = await dispatchCommand(REPLAY_COMMANDS.PLAY, {
    sessionId: created.session.id,
    intervalMs: 10,
  });
  assert.deepEqual(duplicate, { playing: true, intervalMs: 25, stepCount: 1, stoppedReason: null });
  assert.equal(timers.size, 1);

  const timer = timers.get(1);
  await timer.callback();
  let state = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  assert.equal(state.cursorTimestamp, '2026-06-01T09:31:00.000Z');
  assert.equal(chartBars.length, 4);

  await dispatchCommand(REPLAY_COMMANDS.PAUSE);
  assert.equal(timer.cleared, true);
  assert.deepEqual(
    await dispatchCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE),
    { playing: false, intervalMs: 25, stepCount: 1, stoppedReason: null }
  );

  const pausedCount = chartBars.length;
  await timer.callback();
  state = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  assert.equal(chartBars.length, pausedCount);
  assert.equal(state.cursorTimestamp, '2026-06-01T09:31:00.000Z');

  await dispatchCommand(REPLAY_COMMANDS.PLAY, {
    sessionId: created.session.id,
    intervalMs: 30,
    stepCount: 1,
  });
  assert.equal(timers.size, 2);
  const secondTimer = timers.get(2);
  await secondTimer.callback();
  state = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  assert.equal(state.cursorTimestamp, '2026-06-01T09:32:00.000Z');
  assert.equal(chartBars.length, pausedCount + 1);

  await secondTimer.callback();
  assert.equal(secondTimer.cleared, true);
  assert.deepEqual(
    await dispatchCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE),
    { playing: false, intervalMs: 30, stepCount: 1, stoppedReason: 'session-end' }
  );

  replayRuntime.stop();
  unregisterReplace();
  unregisterMetrics();
  sessionRuntime.stop();
  barDataRuntime.stop();
} finally {
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
}

console.log('v5 replay play smoke passed');
