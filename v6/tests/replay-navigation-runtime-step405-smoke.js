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

function installOwnerCommands(calls) {
  let replayState = {
    cursorTime: '2026-05-01T20:00:00.000Z',
    endTime: '2026-05-04T23:30:00.000Z',
    sessionId: 'session-405',
    startTime: '2026-05-01T13:30:00.000Z',
    status: 'playing',
    symbol: 'NQ',
    timeframe: '1m',
  };
  registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({ ...replayState }));
  registerCommand(REPLAY_COMMANDS.PAUSE, () => {
    calls.push(REPLAY_COMMANDS.PAUSE);
    replayState = { ...replayState, status: 'paused' };
    return replayState;
  });
  registerCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, ({ cursorTime }) => {
    calls.push({ command: REPLAY_COMMANDS.SET_CURSOR_TIME, cursorTime });
    replayState = { ...replayState, cursorTime };
    return replayState;
  });
  registerCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP, async () => {
    calls.push(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP);
    await dispatchCommand(REPLAY_COMMANDS.PAUSE);
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
}

{
  clearCommandsForTest();
  clearEventsForTest();
  const calls = [];
  const events = [];
  installOwnerCommands(calls);
  const runtime = createReplayNavigationRuntime({
    materializeCursor: async ({ fromCursorTime, paneIds, replayState }) => {
      calls.push({ command: 'materialize', cursorTime: replayState.cursorTime, fromCursorTime, paneIds });
      return {
        appendedBarCount: paneIds.length,
        chartRecords: paneIds.map((paneId) => ({ bars: [{}], paneId })),
        loadedWindows: paneIds.map((paneId) => ({ paneId })),
      };
    },
    resolveTarget: async () => {
      calls.push('resolve-target');
      return {
        action: REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION,
        attemptedCandidates: 2,
        candidate: { anchor: 'londonSession', timestampIso: '2026-05-02T06:00:00.000Z' },
        sourceBar: { timestamp: Date.parse('2026-05-02T06:02:00.000Z') / 1000 },
        sourceCursorTime: '2026-05-02T06:02:00.000Z',
        status: 'resolved',
      };
    },
  });
  runtime.start({ emitEvent });
  const unsubscribe = subscribeEvent(REPLAY_NAVIGATION_EVENTS.COMPLETED, (event) => events.push(event));

  const state = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION,
    paneIds: ['main', 'secondary'],
  });
  assert.equal(state.status, 'completed');
  assert.equal(state.inFlight, false);
  assert.equal(state.lastResult.appendedBarCount, 2);
  assert.deepEqual(state.lastResult.paneIds, ['main', 'secondary']);
  assert.equal(events.length, 1);
  assert.deepEqual(calls, [
    'resolve-target',
    CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP,
    REPLAY_COMMANDS.PAUSE,
    { command: REPLAY_COMMANDS.SET_CURSOR_TIME, cursorTime: '2026-05-02T06:02:00.000Z' },
    {
      command: 'materialize',
      cursorTime: '2026-05-02T06:02:00.000Z',
      fromCursorTime: '2026-05-01T20:00:00.000Z',
      paneIds: ['main', 'secondary'],
    },
  ]);
  assert.equal(calls.filter((call) => call?.command === REPLAY_COMMANDS.SET_CURSOR_TIME).length, 1);
  unsubscribe();
  runtime.stop();
}

{
  clearCommandsForTest();
  clearEventsForTest();
  const calls = [];
  const rejectedEvents = [];
  installOwnerCommands(calls);
  const runtime = createReplayNavigationRuntime({
    materializeCursor: async () => calls.push('unexpected-materialize'),
    resolveTarget: async () => ({
      attemptedCandidates: 4,
      reason: 'no-real-source-bar',
      status: 'rejected',
    }),
  });
  runtime.start({ emitEvent });
  subscribeEvent(REPLAY_NAVIGATION_EVENTS.REJECTED, (event) => rejectedEvents.push(event));
  const state = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
  });
  assert.equal(state.status, 'rejected');
  assert.equal(state.lastResult.reason, 'no-real-source-bar');
  assert.equal(state.lastResult.attemptedCandidates, 4);
  assert.equal(rejectedEvents.length, 1);
  assert.deepEqual(calls, []);
  runtime.stop();
}

{
  clearCommandsForTest();
  clearEventsForTest();
  const calls = [];
  installOwnerCommands(calls);
  let releaseTarget;
  const targetPending = new Promise((resolve) => { releaseTarget = resolve; });
  const runtime = createReplayNavigationRuntime({
    materializeCursor: async () => ({ appendedBarCount: 1, chartRecords: [], loadedWindows: [] }),
    resolveTarget: async () => targetPending,
  });
  runtime.start({ emitEvent });
  const first = dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.ASIAN_SESSION,
  });
  await Promise.resolve();
  const second = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
    action: REPLAY_NAVIGATION_ACTIONS.LONDON_SESSION,
  });
  assert.equal(second.requestResult.reason, 'in-flight');
  releaseTarget({
    action: REPLAY_NAVIGATION_ACTIONS.ASIAN_SESSION,
    attemptedCandidates: 1,
    candidate: {},
    sourceBar: { timestamp: Date.parse('2026-05-01T23:00:00.000Z') / 1000 },
    sourceCursorTime: '2026-05-01T23:00:00.000Z',
    status: 'resolved',
  });
  assert.equal((await first).status, 'completed');
  assert.equal(calls.filter((call) => call?.command === REPLAY_COMMANDS.SET_CURSOR_TIME).length, 1);
  runtime.stop();
}

console.log('V6 replay navigation runtime Step 405 smoke passed.');
