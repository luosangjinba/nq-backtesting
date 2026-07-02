import { dispatchCommand, hasCommand, registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { BAR_DATA_COMMANDS } from '../contracts/bar-data-contracts.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import { SESSION_COMMANDS } from '../contracts/session-contracts.js';
import { createReplayChartSync } from './replay-chart-sync.js';
import { createReplayDisplayWindowController } from './replay-display-window-controller.js';
import { createReplayPlaybackController } from './replay-playback-controller.js';
import { createReplayPrefixController } from './replay-prefix-controller.js';
import {
  MAX_PREFIX_BARS,
  assertNoDisplayBarsAfter,
  assertNoFutureDisplayBars,
  canRevealBar,
  cloneReplayValue as clone,
  computePrefixBarCount,
  createCountdownSnapshot,
  emptyReplayState,
  filterDisplayBarsForCursor,
  isoFromTimestamp,
  isAtOrAfterSessionEnd,
  normalizeStepCount,
  normalizeTimeframe,
  selectNextBar,
  selectStartBar,
  timeframeSeconds,
  timestampSeconds,
} from './replay-runtime-state.js';

export { REPLAY_COMMANDS, REPLAY_EVENTS };
export {
  assertNoDisplayBarsAfter,
  assertNoFutureDisplayBars,
  canRevealBar,
  computePrefixBarCount,
  isAtOrAfterSessionEnd,
  isDisplayBarAllowed,
  mergeSparseDisplayBars,
  splitRetainedPrefixChunks,
} from './replay-runtime-state.js';

export function createReplayRuntime() {
  const unregisterCallbacks = [];
  let state = emptyReplayState();
  let initialLoadSequence = 0;
  let emit = () => {};
  const chartSync = createReplayChartSync({
    getState: () => state,
    dispatchCommand,
    hasCommand,
    chartCommands: CHART_COMMANDS,
  });
  const prefixController = createReplayPrefixController({
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
      return state;
    },
    dispatchCommand,
    chartSync,
    emitEvent: (eventName, payload) => emit(eventName, payload),
  });
  const displayWindowController = createReplayDisplayWindowController({
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
      return state;
    },
    dispatchCommand,
    chartSync,
    ensureInitialSession: (payload) => loadInitialSession(payload),
    emitEvent: (eventName, payload) => emit(eventName, payload),
  });
  const playbackController = createReplayPlaybackController({
    getSessionId: () => state.sessionId,
    advanceReplay: (payload) => next(payload),
    emitEvent: (eventName, payload) => emit(eventName, payload),
  });

  function replaySnapshot(extra = {}) {
    const snapshot = clone(state);
    return {
      ...snapshot,
      countdown: createCountdownSnapshot(snapshot),
      ...extra,
    };
  }

  async function persistReplayCursor({ cursorTimestamp, revealedCount }) {
    return dispatchCommand(SESSION_COMMANDS.UPDATE_CURSOR, {
      sessionId: state.sessionId,
      startBarTimestamp: state.startBar?.time || state.startBarTimestamp,
      cursorTimestamp,
      revealedCount,
    });
  }

  async function clearPersistedReplayCursor() {
    return dispatchCommand(SESSION_COMMANDS.UPDATE_CURSOR, {
      sessionId: state.sessionId,
      startBarTimestamp: state.startBar?.time || state.startBarTimestamp,
      cursorTimestamp: state.startBar?.time || state.startBarTimestamp,
      revealedCount: 0,
    });
  }

  function assertCurrentInitialLoad(sessionId, loadSequence) {
    if (!loadSequence) return;
    if (loadSequence !== initialLoadSequence || state.sessionId !== sessionId) {
      throw new Error('Stale replay initial load ignored.');
    }
  }

  async function resolveStartBar({ sessionId, loadSequence } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }

    const record = await dispatchCommand(SESSION_COMMANDS.GET, { sessionId });
    const session = record?.session;
    const cursor = record?.cursor;
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
    if (loadSequence && loadSequence !== initialLoadSequence) {
      throw new Error('Stale replay initial load ignored.');
    }
    const startBar = selectStartBar(window.bars, session.sessionStart);
    prefixController.resetAnchors();

    state = {
      ...state,
      sessionId: session.id,
      session: clone(session),
      persistedCursor: clone(cursor),
      startBar: clone(startBar),
      startBarTimestamp: startBar.time,
      cursorTimestamp: startBar.time,
      revealedCount: 0,
      replayTimeframe: session.timeframe,
      displayTimeframe: session.timeframe,
      displayBarsTimeframe: null,
      prefixBars: [],
      prefixChunks: [],
      releasedPrefixChunks: [],
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

  async function loadPersistedRevealBars(cursor, { sessionId = state.sessionId, loadSequence } = {}) {
    if (!cursor?.cursorTimestamp || !state.startBar) return [];
    assertCurrentInitialLoad(sessionId, loadSequence);
    const startTimestamp = Number(state.startBar.timestamp);
    const targetTimestamp = timestampSeconds(cursor.cursorTimestamp);
    if (targetTimestamp <= startTimestamp) return [];

    const targetRevealCount = Math.max(1, Number(cursor.revealedCount) || 0);
    const revealedBars = [];
    let anchor = state.startBar.time;
    while (revealedBars.length < targetRevealCount) {
      const remaining = targetRevealCount - revealedBars.length;
      const count = Math.min(remaining + 1, MAX_PREFIX_BARS);
      const window = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
        instrument: state.session.instrument,
        timeframe: state.session.timeframe,
        anchor,
        direction: 'forward',
        count,
      });
      assertCurrentInitialLoad(sessionId, loadSequence);
      const nextBars = window.bars
        .filter((bar) => Number(bar?.timestamp) > timestampSeconds(anchor))
        .filter((bar) => Number(bar?.timestamp) <= targetTimestamp)
        .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
      if (!nextBars.length) break;
      revealedBars.push(...nextBars);
      anchor = nextBars[nextBars.length - 1].time;
      if (Number(nextBars[nextBars.length - 1].timestamp) >= targetTimestamp) break;
    }

    const latest = revealedBars[revealedBars.length - 1];
    if (!latest || Number(latest.timestamp) < targetTimestamp) {
      throw new Error('Unable to restore replay cursor from bounded bar windows.');
    }
    return revealedBars.slice(0, targetRevealCount);
  }

  async function loadInitialPrefix({ sessionId, loadSequence } = {}) {
    if (!state.startBar || state.sessionId !== sessionId) {
      await resolveStartBar({ sessionId, loadSequence });
    }
    assertCurrentInitialLoad(sessionId, loadSequence);

    const metrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS);
    assertCurrentInitialLoad(sessionId, loadSequence);
    const prefixCount = computePrefixBarCount(metrics);
    const window = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
      instrument: state.session.instrument,
      timeframe: state.session.timeframe,
      anchor: state.startBar.time,
      direction: 'backward',
      count: prefixCount + 1,
    });
    assertCurrentInitialLoad(sessionId, loadSequence);
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
    const loadSequence = ++initialLoadSequence;
    if (state.status !== 'prefix-loaded' || state.sessionId !== sessionId) {
      await loadInitialPrefix({ sessionId, loadSequence });
    }
    assertCurrentInitialLoad(sessionId, loadSequence);

    const persistedRevealBars = await loadPersistedRevealBars(state.persistedCursor, {
      sessionId,
      loadSequence,
    });
    assertCurrentInitialLoad(sessionId, loadSequence);
    const restoredCursor = persistedRevealBars.length
      ? persistedRevealBars[persistedRevealBars.length - 1]
      : state.startBar;
    const restoredCursorTimestamp = restoredCursor.time;
    const revealedCount = persistedRevealBars.length;
    const displayBars = [
      ...state.prefixBars,
      state.startBar,
      ...persistedRevealBars,
    ];
    assertNoDisplayBarsAfter(displayBars, restoredCursorTimestamp);
    await chartSync.renderDisplayBars(displayBars, restoredCursorTimestamp, { resumeViewportFollow: true });
    assertCurrentInitialLoad(sessionId, loadSequence);
    await chartSync.syncChartRightEdgeLimit(restoredCursorTimestamp);
    assertCurrentInitialLoad(sessionId, loadSequence);
    await chartSync.syncChartDisplayContext({
      displayTimeframe: state.displayTimeframe || state.session.timeframe,
      bars: displayBars,
    });
    assertCurrentInitialLoad(sessionId, loadSequence);

    state = {
      ...state,
      replayTimeframe: state.session.timeframe,
      displayTimeframe: state.displayTimeframe || state.session.timeframe,
      displayBarsTimeframe: state.displayTimeframe || state.session.timeframe,
      cursorTimestamp: restoredCursorTimestamp,
      revealedCount,
      displayBars: clone(displayBars),
      status: 'initial-loaded',
    };
    emit(REPLAY_EVENTS.INITIAL_LOADED, {
      session: clone(state.session),
      startBar: clone(state.startBar),
      cursorTimestamp: state.cursorTimestamp,
      revealedCount: state.revealedCount,
      displayBars: clone(displayBars),
      viewportMetrics: clone(state.viewportMetrics),
    });
    return clone(state);
  }

  function getDisplayContext() {
    return displayWindowController.displayContextSnapshot();
  }

  async function next({ sessionId = state.sessionId, stepCount = 1 } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    const normalizedStepCount = normalizeStepCount(stepCount);
    if (normalizedStepCount > 1) {
      let result = null;
      for (let index = 0; index < normalizedStepCount; index += 1) {
        result = await next({ sessionId, stepCount: 1 });
        if (!result.advanced) return result;
      }
      return result;
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

    const revealedCount = state.revealedCount + 1;
    const persisted = await persistReplayCursor({
      cursorTimestamp: nextBar.time,
      revealedCount,
    });
    const normalizedDisplayTimeframe = normalizeTimeframe(
      state.displayTimeframe || state.session.timeframe,
      'display timeframe'
    );
    const normalizedReplayTimeframe = normalizeTimeframe(
      state.replayTimeframe || state.session.timeframe,
      'replay timeframe'
    );
    const displayBars = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? [
        ...state.displayBars,
        nextBar,
      ]
      : state.displayBars;
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(nextBar.time);
      await chartSync.renderDisplayBars(displayBars, nextBar.time);
    }

    state = {
      ...state,
      persistedCursor: clone(persisted.cursor),
      cursorTimestamp: nextBar.time,
      revealedCount,
      displayBarsTimeframe: normalizedDisplayTimeframe,
      displayBars: clone(displayBars),
      status: 'replay-ready',
    };
    if (normalizedDisplayTimeframe !== normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(nextBar.time);
      await displayWindowController.projectDisplayForCursor({
        sessionId,
        displayTimeframe: normalizedDisplayTimeframe,
        cursorTimestamp: nextBar.time,
      });
    }
    const result = {
      ...clone(state),
      advanced: true,
      revealedBar: clone(nextBar),
    };
    emit(REPLAY_EVENTS.NEXT, result);
    return result;
  }

  async function previous({ sessionId = state.sessionId, stepCount = 1 } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    const normalizedStepCount = normalizeStepCount(stepCount);
    if (normalizedStepCount > 1) {
      let result = null;
      for (let index = 0; index < normalizedStepCount; index += 1) {
        result = await previous({ sessionId, stepCount: 1 });
        if (!result.rewound) return result;
      }
      return result;
    }
    playbackController.pause();
    if (state.sessionId !== sessionId || state.status === 'idle') {
      await loadInitialSession({ sessionId });
    }
    if (!state.displayBars.length || !state.cursorTimestamp) {
      throw new Error('replay initial session must be loaded before Previous.');
    }
    if (!state.revealedCount || state.revealedCount <= 0) {
      return {
        ...clone(state),
        rewound: false,
        reason: 'start-bar',
      };
    }

    const normalizedDisplayTimeframe = normalizeTimeframe(
      state.displayTimeframe || state.session.timeframe,
      'display timeframe'
    );
    const normalizedReplayTimeframe = normalizeTimeframe(
      state.replayTimeframe || state.session.timeframe,
      'replay timeframe'
    );
    const cursorTimestamp = timestampSeconds(state.cursorTimestamp);
    const replayBars = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? state.displayBars
        .filter((bar) => Number(bar?.timestamp) <= cursorTimestamp)
        .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      : [];
    const currentBarIndex = replayBars.findIndex((bar) => Number(bar?.timestamp) === cursorTimestamp);
    const previousCursorTimestamp = cursorTimestamp - timeframeSeconds(normalizedReplayTimeframe);
    const previousCursorBar = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? currentBarIndex > 0
        ? replayBars[currentBarIndex - 1]
        : null
      : {
        timestamp: previousCursorTimestamp,
        time: isoFromTimestamp(previousCursorTimestamp),
      };
    if (!previousCursorBar) {
      return {
        ...clone(state),
        rewound: false,
        reason: 'previous-bar-unavailable',
      };
    }

    const revealedCount = Math.max(0, state.revealedCount - 1);
    const persisted = await persistReplayCursor({
      cursorTimestamp: previousCursorBar.time,
      revealedCount,
    });
    let displayBars = state.displayBars;
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      displayBars = filterDisplayBarsForCursor(state.displayBars, {
        cursorTimestamp: previousCursorBar.time,
        displayTimeframe: normalizedDisplayTimeframe,
        replayTimeframe: normalizedReplayTimeframe,
      });
      assertNoDisplayBarsAfter(displayBars, previousCursorBar.time);
      await chartSync.syncChartRightEdgeLimit(previousCursorBar.time);
      await chartSync.renderDisplayBars(displayBars, previousCursorBar.time);
    }

    state = {
      ...state,
      persistedCursor: clone(persisted.cursor),
      cursorTimestamp: previousCursorBar.time,
      revealedCount,
      displayBarsTimeframe: normalizedDisplayTimeframe,
      displayBars: clone(displayBars),
      status: revealedCount > 0 ? 'replay-ready' : 'initial-loaded',
    };
    if (normalizedDisplayTimeframe !== normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(previousCursorBar.time);
      await displayWindowController.projectDisplayForCursor({
        sessionId,
        displayTimeframe: normalizedDisplayTimeframe,
        cursorTimestamp: previousCursorBar.time,
      });
      displayBars = state.displayBars;
    }
    const result = {
      ...clone(state),
      rewound: true,
      cursorBar: clone(previousCursorBar),
    };
    emit(REPLAY_EVENTS.PREVIOUS, result);
    return result;
  }

  async function truncateToTimestamp({
    sessionId = state.sessionId,
    timestamp,
  } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (timestamp == null) {
      throw new Error('replay truncate timestamp is required.');
    }
    playbackController.pause();
    if (state.sessionId !== sessionId || state.status === 'idle') {
      await loadInitialSession({ sessionId });
    }
    if (!state.displayBars.length || !state.cursorTimestamp || !state.startBar) {
      throw new Error('replay initial session must be loaded before truncation.');
    }

    const normalizedDisplayTimeframe = normalizeTimeframe(
      state.displayTimeframe || state.session.timeframe,
      'display timeframe'
    );
    const normalizedReplayTimeframe = normalizeTimeframe(
      state.replayTimeframe || state.session.timeframe,
      'replay timeframe'
    );
    const selectedTimestamp = timestampSeconds(timestamp);
    const startTimestamp = timestampSeconds(state.startBar.time);
    const cursorTimestamp = timestampSeconds(state.cursorTimestamp);
    if (selectedTimestamp < startTimestamp || selectedTimestamp > cursorTimestamp) {
      return {
        ...clone(state),
        truncated: false,
        reason: 'selected-bar-out-of-range',
      };
    }

    const replayBars = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? state.displayBars
        .filter((bar) => Number(bar?.timestamp) >= startTimestamp && Number(bar?.timestamp) <= cursorTimestamp)
        .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      : [];
    const selectedBar = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? replayBars.find((bar) => Number(bar?.timestamp) === selectedTimestamp)
      : {
        timestamp: selectedTimestamp,
        time: isoFromTimestamp(selectedTimestamp),
      };
    if (!selectedBar) {
      return {
        ...clone(state),
        truncated: false,
        reason: 'selected-bar-unavailable',
      };
    }

    const revealedCount = Math.max(
      0,
      Math.floor((selectedTimestamp - startTimestamp) / timeframeSeconds(normalizedReplayTimeframe))
    );
    const persisted = await persistReplayCursor({
      cursorTimestamp: selectedBar.time,
      revealedCount,
    });
    let displayBars = state.displayBars;
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      displayBars = filterDisplayBarsForCursor(state.displayBars, {
        cursorTimestamp: selectedBar.time,
        displayTimeframe: normalizedDisplayTimeframe,
        replayTimeframe: normalizedReplayTimeframe,
      });
      assertNoDisplayBarsAfter(displayBars, selectedBar.time);
      await chartSync.renderDisplayBars(displayBars, selectedBar.time, { resumeViewportFollow: true });
      await chartSync.syncChartRightEdgeLimit(selectedBar.time);
    }

    state = {
      ...state,
      persistedCursor: clone(persisted.cursor),
      cursorTimestamp: selectedBar.time,
      revealedCount,
      displayBarsTimeframe: normalizedDisplayTimeframe,
      displayBars: clone(displayBars),
      status: revealedCount > 0 ? 'replay-ready' : 'initial-loaded',
    };
    if (normalizedDisplayTimeframe !== normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(selectedBar.time);
      await displayWindowController.projectDisplayForCursor({
        sessionId,
        displayTimeframe: normalizedDisplayTimeframe,
        cursorTimestamp: selectedBar.time,
      });
      displayBars = state.displayBars;
    }
    const result = {
      ...clone(state),
      truncated: true,
      selectedBar: clone(selectedBar),
    };
    emit(REPLAY_EVENTS.TRUNCATED, result);
    return result;
  }

  async function reset({ sessionId = state.sessionId } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    playbackController.pause();
    if (!state.startBar || state.sessionId !== sessionId) {
      await loadInitialPrefix({ sessionId });
    }
    const normalizedDisplayTimeframe = normalizeTimeframe(
      state.displayTimeframe || state.session.timeframe,
      'display timeframe'
    );
    const normalizedReplayTimeframe = normalizeTimeframe(
      state.replayTimeframe || state.session.timeframe,
      'replay timeframe'
    );
    let displayBars = [
      ...state.prefixBars,
      state.startBar,
    ];
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      assertNoFutureDisplayBars(displayBars, state.startBar);
      await chartSync.renderDisplayBars(displayBars, state.startBar.time, { resumeViewportFollow: true });
      await chartSync.syncChartRightEdgeLimit(state.startBar.time);
    }

    state = {
      ...state,
      persistedCursor: {
        sessionId,
        startBarTimestamp: state.startBar.time,
        cursorTimestamp: state.startBar.time,
        revealedCount: 0,
      },
      cursorTimestamp: state.startBar.time,
      revealedCount: 0,
      displayBarsTimeframe: normalizedDisplayTimeframe,
      displayBars: clone(displayBars),
      status: 'initial-loaded',
    };
    await clearPersistedReplayCursor();
    if (normalizedDisplayTimeframe !== normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(state.startBar.time);
      await displayWindowController.projectDisplayForCursor({
        sessionId,
        displayTimeframe: normalizedDisplayTimeframe,
        cursorTimestamp: state.startBar.time,
      });
      displayBars = state.displayBars;
    }
    const result = {
      ...clone(state),
      reset: true,
    };
    emit(REPLAY_EVENTS.RESET, result);
    return result;
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(REPLAY_COMMANDS.RESOLVE_START_BAR, (payload) => resolveStartBar(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_PREFIX, (payload) => loadInitialPrefix(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, (payload) => loadInitialSession(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_PREFIX_DEMAND, (payload) => prefixController.loadPrefixDemand(payload)),
      registerCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, (payload) => displayWindowController.setDisplayTimeframe(payload)),
      registerCommand(REPLAY_COMMANDS.GET_DISPLAY_CONTEXT, () => getDisplayContext()),
      registerCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, (payload) => displayWindowController.loadDisplayWindow(payload)),
      registerCommand(REPLAY_COMMANDS.APPLY_PREFIX_RETENTION, (payload) => prefixController.applyPrefixRetention(payload)),
      registerCommand(REPLAY_COMMANDS.NEXT, (payload) => next(payload)),
      registerCommand(REPLAY_COMMANDS.PREVIOUS, (payload) => previous(payload)),
      registerCommand(REPLAY_COMMANDS.TRUNCATE_TO_TIMESTAMP, (payload) => truncateToTimestamp(payload)),
      registerCommand(REPLAY_COMMANDS.PLAY, (payload) => playbackController.play(payload)),
      registerCommand(REPLAY_COMMANDS.PAUSE, (payload) => playbackController.pause(payload)),
      registerCommand(REPLAY_COMMANDS.RESET, (payload) => reset(payload)),
      registerCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE, () => playbackController.snapshot()),
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => replaySnapshot()),
      subscribeEvent(CHART_EVENTS.PREFIX_DEMAND, (payload) => {
        dispatchCommand(REPLAY_COMMANDS.LOAD_PREFIX_DEMAND, payload).catch((error) => {
          queueMicrotask(() => {
            throw error;
          });
        });
      }),
      subscribeEvent(CHART_EVENTS.VISIBLE_RANGE_CHANGED, (payload) => {
        dispatchCommand(REPLAY_COMMANDS.APPLY_PREFIX_RETENTION, payload).catch((error) => {
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
    playbackController.reset();
    state = emptyReplayState();
    initialLoadSequence = 0;
    prefixController.resetAnchors();
    displayWindowController.reset();
  }

  return {
    id: 'runtime.replay',
    start,
    stop,
  };
}
