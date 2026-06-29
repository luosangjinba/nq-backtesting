import { dispatchCommand, registerCommand } from './commands.js';
import { BAR_DATA_COMMANDS } from './bar-data-runtime.js';
import { SESSION_COMMANDS } from './session-runtime.js';

export const REPLAY_COMMANDS = Object.freeze({
  RESOLVE_START_BAR: 'replay.resolveStartBar',
  GET_STATE: 'replay.getState',
});

export const REPLAY_EVENTS = Object.freeze({
  START_BAR_RESOLVED: 'replay:startBarResolved',
});

function emptyState() {
  return {
    sessionId: null,
    session: null,
    startBar: null,
    startBarTimestamp: null,
    cursorTimestamp: null,
    status: 'idle',
  };
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function timestampSeconds(value) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('replay timestamp must be valid.');
  }
  return Math.floor(parsed / 1000);
}

function selectStartBar(bars = [], sessionStart) {
  const startTimestamp = timestampSeconds(sessionStart);
  const candidates = bars
    .filter((bar) => Number(bar?.timestamp) >= startTimestamp)
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
  const startBar = candidates[0];
  if (!startBar) {
    throw new Error('Unable to resolve replay start bar.');
  }
  return startBar;
}

export function createReplayRuntime() {
  const unregisterCallbacks = [];
  let state = emptyState();
  let emit = () => {};

  async function resolveStartBar({ sessionId } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }

    const record = await dispatchCommand(SESSION_COMMANDS.GET, { sessionId });
    const session = record?.session;
    if (!session) {
      throw new Error(`Replay session "${sessionId}" was not found.`);
    }

    const window = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
      instrument: session.instrument,
      timeframe: session.timeframe,
      anchor: session.sessionStart,
      direction: 'forward',
      count: 2,
    });
    const startBar = selectStartBar(window.bars, session.sessionStart);

    state = {
      ...state,
      sessionId: session.id,
      session: clone(session),
      startBar: clone(startBar),
      startBarTimestamp: startBar.time,
      cursorTimestamp: startBar.time,
      status: 'start-resolved',
    };
    emit(REPLAY_EVENTS.START_BAR_RESOLVED, {
      session: clone(session),
      startBar: clone(startBar),
    });
    return clone(state);
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(REPLAY_COMMANDS.RESOLVE_START_BAR, (payload) => resolveStartBar(payload)),
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => clone(state))
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = emptyState();
  }

  return {
    id: 'runtime.replay',
    start,
    stop,
  };
}
