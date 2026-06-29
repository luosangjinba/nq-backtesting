import { dispatchCommand, hasCommand, registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { BAR_DATA_COMMANDS } from './bar-data-runtime.js';
import { CHART_COMMANDS, CHART_EVENTS } from './chart-runtime.js';
import { SESSION_COMMANDS } from './session-runtime.js';

export const REPLAY_COMMANDS = Object.freeze({
  RESOLVE_START_BAR: 'replay.resolveStartBar',
  LOAD_INITIAL_PREFIX: 'replay.loadInitialPrefix',
  LOAD_INITIAL_SESSION: 'replay.loadInitialSession',
  LOAD_PREFIX_DEMAND: 'replay.loadPrefixDemand',
  NEXT: 'replay.next',
  PLAY: 'replay.play',
  PAUSE: 'replay.pause',
  GET_PLAYBACK_STATE: 'replay.getPlaybackState',
  GET_STATE: 'replay.getState',
});

export const REPLAY_EVENTS = Object.freeze({
  START_BAR_RESOLVED: 'replay:startBarResolved',
  PREFIX_LOADED: 'replay:prefixLoaded',
  PREFIX_CHUNK_LOADED: 'replay:prefixChunkLoaded',
  INITIAL_LOADED: 'replay:initialLoaded',
  NEXT: 'replay:next',
  PLAYBACK_CHANGED: 'replay:playbackChanged',
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
    prefixChunks: [],
    displayBars: [],
    viewportMetrics: null,
    status: 'idle',
  };
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function timestampSeconds(value) {
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}:00.000Z`
    : value;
  const parsed = Date.parse(normalized);
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

function selectNextBar(bars = [], cursorTimestamp) {
  const cursor = timestampSeconds(cursorTimestamp);
  const candidates = bars
    .filter((bar) => Number(bar?.timestamp) > cursor)
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
  return candidates[0] || null;
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

export function isAtOrAfterSessionEnd(cursorTimestamp, sessionEnd) {
  return timestampSeconds(cursorTimestamp) >= timestampSeconds(sessionEnd);
}

export function canRevealBar(bar, sessionEnd) {
  return Number(bar?.timestamp) <= timestampSeconds(sessionEnd);
}

export function createReplayRuntime() {
  const unregisterCallbacks = [];
  const setTimer = globalThis.setInterval?.bind(globalThis);
  const clearTimer = globalThis.clearInterval?.bind(globalThis);
  let state = emptyState();
  let playback = {
    playing: false,
    intervalMs: 500,
    timerId: null,
    advancing: false,
  };
  let emit = () => {};
  const loadedPrefixAnchors = new Set();
  const loadingPrefixAnchors = new Set();

  async function syncChartRightEdgeLimit(rightEdge) {
    if (hasCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT)) {
      await dispatchCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, { rightEdge });
    }
  }

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
    await syncChartRightEdgeLimit(state.startBar.time);

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

  async function loadPrefixDemand({ prefixDemand } = {}) {
    if (!state.session || !state.sessionId) {
      return {
        ...clone(state),
        loaded: false,
        reason: 'no-session',
      };
    }
    if (!prefixDemand?.anchor) {
      throw new Error('replay prefix demand anchor is required.');
    }

    const anchor = prefixDemand.anchor;
    if (loadedPrefixAnchors.has(anchor) || loadingPrefixAnchors.has(anchor)) {
      return {
        ...clone(state),
        loaded: false,
        reason: 'duplicate-prefix-demand',
      };
    }

    const suggestedCount = Number(prefixDemand.suggestedCount || DEFAULT_PREFIX_BARS);
    const count = Math.min(Math.max(1, Math.ceil(suggestedCount)), MAX_PREFIX_BARS);
    loadingPrefixAnchors.add(anchor);
    try {
      const window = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
        instrument: state.session.instrument,
        timeframe: state.session.timeframe,
        anchor,
        direction: 'backward',
        count,
      });
      const earliestLoadedTimestamp = Number(prefixDemand.earliestLoadedTimestamp);
      const bars = window.bars
        .filter((bar) => !Number.isFinite(earliestLoadedTimestamp) || Number(bar?.timestamp) < earliestLoadedTimestamp)
        .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
      const chunk = {
        anchor,
        earliestLoadedTimestamp: Number.isFinite(earliestLoadedTimestamp) ? earliestLoadedTimestamp : null,
        bars: clone(bars),
        window: {
          key: window.key,
          start: window.start,
          end: window.end,
          direction: window.direction,
          estimatedBars: window.estimatedBars,
        },
      };
      state = {
        ...state,
        prefixChunks: [
          chunk,
          ...state.prefixChunks,
        ],
      };
      loadedPrefixAnchors.add(anchor);
      const result = {
        ...clone(state),
        loaded: true,
        prefixChunk: clone(chunk),
      };
      emit(REPLAY_EVENTS.PREFIX_CHUNK_LOADED, result);
      return result;
    } finally {
      loadingPrefixAnchors.delete(anchor);
    }
  }

  async function next({ sessionId = state.sessionId } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (state.sessionId !== sessionId || state.status === 'idle') {
      await loadInitialSession({ sessionId });
    }
    if (!state.displayBars.length || !state.cursorTimestamp) {
      throw new Error('replay initial session must be loaded before Next.');
    }

    if (isAtOrAfterSessionEnd(state.cursorTimestamp, state.session.sessionEnd)) {
      return {
        ...clone(state),
        advanced: false,
        reason: 'session-end',
      };
    }

    const window = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
      instrument: state.session.instrument,
      timeframe: state.session.timeframe,
      anchor: state.cursorTimestamp,
      direction: 'forward',
      count: 2,
    });
    const nextBar = selectNextBar(window.bars, state.cursorTimestamp);
    if (!nextBar || !canRevealBar(nextBar, state.session.sessionEnd)) {
      return {
        ...clone(state),
        advanced: false,
        reason: 'session-end',
      };
    }

    const displayBars = [
      ...state.displayBars,
      nextBar,
    ];
    await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars: displayBars });
    await syncChartRightEdgeLimit(nextBar.time);

    state = {
      ...state,
      cursorTimestamp: nextBar.time,
      displayBars: clone(displayBars),
      status: 'replay-ready',
    };
    const result = {
      ...clone(state),
      advanced: true,
      revealedBar: clone(nextBar),
    };
    emit(REPLAY_EVENTS.NEXT, result);
    return result;
  }

  function playbackSnapshot() {
    return {
      playing: playback.playing,
      intervalMs: playback.intervalMs,
    };
  }

  function setPlayback(nextPlayback) {
    playback = {
      ...playback,
      ...nextPlayback,
    };
    const snapshot = playbackSnapshot();
    emit(REPLAY_EVENTS.PLAYBACK_CHANGED, snapshot);
    return snapshot;
  }

  async function playTick(sessionId) {
    if (playback.advancing || !playback.playing) return;
    playback.advancing = true;
    try {
      const result = await next({ sessionId });
      if (!result.advanced) {
        pause();
      }
    } finally {
      playback.advancing = false;
    }
  }

  function play({ sessionId = state.sessionId, intervalMs = 500 } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    const normalizedInterval = Number(intervalMs);
    if (!Number.isFinite(normalizedInterval) || normalizedInterval <= 0) {
      throw new Error('replay play intervalMs must be a positive number.');
    }
    if (playback.playing) {
      return playbackSnapshot();
    }
    if (typeof setTimer !== 'function' || typeof clearTimer !== 'function') {
      throw new Error('replay playback timers are unavailable.');
    }

    const timerId = setTimer(() => playTick(sessionId), normalizedInterval);
    return setPlayback({
      playing: true,
      intervalMs: normalizedInterval,
      timerId,
    });
  }

  function pause() {
    if (playback.timerId !== null && typeof clearTimer === 'function') {
      clearTimer(playback.timerId);
    }
    return setPlayback({
      playing: false,
      timerId: null,
    });
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(REPLAY_COMMANDS.RESOLVE_START_BAR, (payload) => resolveStartBar(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_PREFIX, (payload) => loadInitialPrefix(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, (payload) => loadInitialSession(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_PREFIX_DEMAND, (payload) => loadPrefixDemand(payload)),
      registerCommand(REPLAY_COMMANDS.NEXT, (payload) => next(payload)),
      registerCommand(REPLAY_COMMANDS.PLAY, (payload) => play(payload)),
      registerCommand(REPLAY_COMMANDS.PAUSE, () => pause()),
      registerCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE, () => playbackSnapshot()),
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => clone(state)),
      subscribeEvent(CHART_EVENTS.PREFIX_DEMAND, (payload) => {
        loadPrefixDemand(payload).catch((error) => {
          queueMicrotask(() => {
            throw error;
          });
        });
      })
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    pause();
    state = emptyState();
    loadedPrefixAnchors.clear();
    loadingPrefixAnchors.clear();
  }

  return {
    id: 'runtime.replay',
    start,
    stop,
  };
}
