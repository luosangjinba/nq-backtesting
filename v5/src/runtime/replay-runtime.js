import { dispatchCommand, registerCommand } from './commands.js';
import { BAR_DATA_COMMANDS } from './bar-data-runtime.js';
import { CHART_COMMANDS } from './chart-runtime.js';
import { SESSION_COMMANDS } from './session-runtime.js';

export const REPLAY_COMMANDS = Object.freeze({
  RESOLVE_START_BAR: 'replay.resolveStartBar',
  LOAD_INITIAL_PREFIX: 'replay.loadInitialPrefix',
  LOAD_INITIAL_SESSION: 'replay.loadInitialSession',
  GET_STATE: 'replay.getState',
});

export const REPLAY_EVENTS = Object.freeze({
  START_BAR_RESOLVED: 'replay:startBarResolved',
  PREFIX_LOADED: 'replay:prefixLoaded',
  INITIAL_LOADED: 'replay:initialLoaded',
});

const DEFAULT_PREFIX_BARS = 119;
const MAX_PREFIX_BARS = 499;

function emptyState() {
  return {
    sessionId: null,
    session: null,
    startBar: null,
    startBarTimestamp: null,
    cursorTimestamp: null,
    prefixBars: [],
    displayBars: [],
    viewportMetrics: null,
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

export function computePrefixBarCount(metrics = {}) {
  const estimatedVisibleBars = Number(metrics?.estimatedVisibleBars);
  if (!Number.isFinite(estimatedVisibleBars) || estimatedVisibleBars <= 1) {
    return DEFAULT_PREFIX_BARS;
  }
  return Math.min(Math.max(1, Math.floor(estimatedVisibleBars) - 1), MAX_PREFIX_BARS);
}

export function assertNoFutureDisplayBars(displayBars = [], startBar) {
  const startTimestamp = Number(startBar?.timestamp);
  if (!Number.isFinite(startTimestamp)) {
    throw new Error('replay start bar timestamp is required.');
  }
  const futureBar = displayBars.find((bar) => Number(bar?.timestamp) > startTimestamp);
  if (futureBar) {
    throw new Error('replay display state must not include future bars.');
  }
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
      prefixBars: [],
      displayBars: [],
      viewportMetrics: null,
      status: 'start-resolved',
    };
    emit(REPLAY_EVENTS.START_BAR_RESOLVED, {
      session: clone(session),
      startBar: clone(startBar),
    });
    return clone(state);
  }

  async function loadInitialPrefix({ sessionId } = {}) {
    if (!state.startBar || state.sessionId !== sessionId) {
      await resolveStartBar({ sessionId });
    }

    const metrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS);
    const prefixCount = computePrefixBarCount(metrics);
    const window = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
      instrument: state.session.instrument,
      timeframe: state.session.timeframe,
      anchor: state.startBar.time,
      direction: 'backward',
      count: prefixCount + 1,
    });
    const startTimestamp = Number(state.startBar.timestamp);
    const prefixBars = window.bars
      .filter((bar) => Number(bar?.timestamp) < startTimestamp)
      .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      .slice(-prefixCount);

    state = {
      ...state,
      prefixBars: clone(prefixBars),
      displayBars: [],
      viewportMetrics: clone(metrics),
      status: 'prefix-loaded',
    };
    emit(REPLAY_EVENTS.PREFIX_LOADED, {
      session: clone(state.session),
      startBar: clone(state.startBar),
      prefixBars: clone(prefixBars),
      viewportMetrics: clone(metrics),
    });
    return clone(state);
  }

  async function loadInitialSession({ sessionId } = {}) {
    if (state.status !== 'prefix-loaded' || state.sessionId !== sessionId) {
      await loadInitialPrefix({ sessionId });
    }

    const displayBars = [
      ...state.prefixBars,
      state.startBar,
    ];
    assertNoFutureDisplayBars(displayBars, state.startBar);
    await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars: displayBars });

    state = {
      ...state,
      displayBars: clone(displayBars),
      status: 'initial-loaded',
    };
    emit(REPLAY_EVENTS.INITIAL_LOADED, {
      session: clone(state.session),
      startBar: clone(state.startBar),
      displayBars: clone(displayBars),
      viewportMetrics: clone(state.viewportMetrics),
    });
    return clone(state);
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(REPLAY_COMMANDS.RESOLVE_START_BAR, (payload) => resolveStartBar(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_PREFIX, (payload) => loadInitialPrefix(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, (payload) => loadInitialSession(payload)),
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
