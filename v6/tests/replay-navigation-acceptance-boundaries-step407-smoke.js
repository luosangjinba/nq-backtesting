import assert from 'node:assert/strict';
import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
  REPLAY_NAVIGATION_COMMANDS,
  REPLAY_NAVIGATION_EVENTS,
  REPLAY_NAVIGATION_PREFERENCES_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createReplayNavigationRuntime } from '../src/replay-navigation/replay-navigation-runtime.js';
import { REPLAY_NAVIGATION_ACTIONS } from '../src/replay-navigation/replay-navigation-schedule.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';

const BASE_REPLAY = Object.freeze({
  cursorTime: '2026-05-01T20:00:00.000Z',
  endTime: '2026-05-08T23:30:00.000Z',
  sessionId: 'session-step407-boundaries',
  startTime: '2026-05-01T13:30:00.000Z',
  status: 'paused',
  symbol: 'NQ',
  timeframe: '1m',
});

function installOwners({ calls, replay = BASE_REPLAY } = {}) {
  let replayState = { ...replay };
  registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({ ...replayState }));
  registerCommand(REPLAY_COMMANDS.PAUSE, () => {
    calls.push(REPLAY_COMMANDS.PAUSE);
    replayState = { ...replayState, status: 'paused' };
    return { ...replayState };
  });
  registerCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, ({ cursorTime }) => {
    calls.push({ command: REPLAY_COMMANDS.SET_CURSOR_TIME, cursorTime });
    replayState = { ...replayState, cursorTime };
    return { ...replayState };
  });
  registerCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP, () => {
    calls.push(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP);
    replayState = { ...replayState, status: 'paused' };
    return { playing: false, status: 'stopped' };
  });
  registerCommand(PANE_COMMANDS.GET_ACTIVE, () => ({ id: 'main', instrument: 'NQ' }));
  registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({ id: paneId, instrument: 'NQ' }));
  registerCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.GET_SNAPSHOT, () => ({
    asianSession: '19:00',
    dayOpen: '18:00',
    londonSession: '02:00',
    newYorkSession: '09:30',
  }));
  return () => ({ ...replayState });
}

function startRuntime({ materializeCursor, resolveTarget }) {
  const runtime = createReplayNavigationRuntime({ materializeCursor, resolveTarget });
  runtime.start({ emitEvent });
  return runtime;
}

function reset() {
  clearCommandsForTest();
  clearEventsForTest();
}

{
  reset();
  const calls = [];
  installOwners({ calls, replay: { ...BASE_REPLAY, status: 'ended' } });
  const rejected = [];
  const runtime = startRuntime({
    materializeCursor: async () => calls.push('unexpected-materialize'),
    resolveTarget: async () => calls.push('unexpected-resolve'),
  });
  subscribeEvent(REPLAY_NAVIGATION_EVENTS.REJECTED, (event) => rejected.push(event));

  const state = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.NEXT_DAY_OPEN,
  });
  assert.equal(state.status, 'rejected');
  assert.equal(state.lastResult.reason, 'replay-ended');
  assert.deepEqual(rejected.map(({ reason }) => reason), ['replay-ended']);
  assert.deepEqual(calls, []);
  runtime.stop();
}

{
  reset();
  const calls = [];
  const getReplay = installOwners({ calls });
  const runtime = startRuntime({
    materializeCursor: async () => calls.push('unexpected-materialize'),
    resolveTarget: async () => ({ attemptedCandidates: 32, reason: 'no-real-source-bar', status: 'rejected' }),
  });

  const state = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.LONDON_SESSION,
  });
  assert.equal(state.lastResult.reason, 'no-real-source-bar');
  assert.equal(state.lastResult.attemptedCandidates, 32);
  assert.equal(getReplay().cursorTime, BASE_REPLAY.cursorTime);
  assert.deepEqual(calls, []);
  runtime.stop();
}

{
  reset();
  const calls = [];
  const getReplay = installOwners({ calls });
  const runtime = startRuntime({
    materializeCursor: async () => calls.push('unexpected-materialize'),
    resolveTarget: async () => { throw new Error('fixture target failure'); },
  });

  const state = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.ASIAN_SESSION,
  });
  assert.equal(state.status, 'rejected');
  assert.equal(state.lastResult.reason, 'navigation-error');
  assert.equal(state.error, 'fixture target failure');
  assert.equal(getReplay().cursorTime, BASE_REPLAY.cursorTime);
  assert.deepEqual(calls, []);
  runtime.stop();
}

{
  reset();
  const calls = [];
  installOwners({ calls });
  const completed = [];
  const runtime = startRuntime({
    materializeCursor: async ({ fromCursorTime, paneIds, replayState }) => {
      calls.push({ command: 'materialize', fromCursorTime, paneIds, to: replayState.cursorTime });
      return {
        appendedBarCount: 720,
        chartRecords: [{ bars: Array.from({ length: 720 }, (_, index) => ({ time: index })), paneId: 'main' }],
        loadedWindows: [{ barCount: 720, paneId: 'main', windowCount: 2 }],
      };
    },
    resolveTarget: async () => ({
      action: REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
      attemptedCandidates: 1,
      candidate: { anchor: 'newYorkSession' },
      sourceBar: { timestamp: Date.parse('2026-05-04T09:30:00.000Z') / 1000 },
      sourceCursorTime: '2026-05-04T09:30:00.000Z',
      status: 'resolved',
    }),
  });
  subscribeEvent(REPLAY_NAVIGATION_EVENTS.COMPLETED, (event) => completed.push(event));

  const state = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
  });
  assert.equal(state.status, 'completed');
  assert.deepEqual(state.lastResult.paneIds, ['main'], 'missing paneIds falls back to the active pane');
  assert.equal(state.lastResult.fromCursorTime, BASE_REPLAY.cursorTime);
  assert.equal(state.lastResult.appendedBarCount, 720);
  assert.equal(completed.length, 1);
  assert.deepEqual(calls, [
    CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP,
    { command: REPLAY_COMMANDS.SET_CURSOR_TIME, cursorTime: '2026-05-04T09:30:00.000Z' },
    {
      command: 'materialize',
      fromCursorTime: BASE_REPLAY.cursorTime,
      paneIds: ['main'],
      to: '2026-05-04T09:30:00.000Z',
    },
  ]);
  runtime.stop();
}

{
  reset();
  const calls = [];
  installOwners({ calls });
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const rejected = [];
  const runtime = startRuntime({
    materializeCursor: async () => ({ appendedBarCount: 1, chartRecords: [], loadedWindows: [] }),
    resolveTarget: async () => pending,
  });
  subscribeEvent(REPLAY_NAVIGATION_EVENTS.REJECTED, (event) => rejected.push(event));

  const first = dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION,
  });
  await Promise.resolve();
  const second = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.NEXT_DAY_OPEN,
  });
  assert.equal(second.requestResult.reason, 'in-flight');
  assert.equal(rejected.at(-1).reason, 'in-flight');
  release({
    action: REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION,
    attemptedCandidates: 1,
    candidate: { anchor: 'asianSession' },
    sourceBar: { timestamp: Date.parse('2026-05-01T23:00:00.000Z') / 1000 },
    sourceCursorTime: '2026-05-01T23:00:00.000Z',
    status: 'resolved',
  });
  assert.equal((await first).status, 'completed');
  assert.equal(calls.filter((call) => call?.command === REPLAY_COMMANDS.SET_CURSOR_TIME).length, 1);
  runtime.stop();
}

reset();
console.log('V6 replay navigation Step 407 acceptance boundaries smoke passed.');
