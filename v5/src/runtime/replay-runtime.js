import { dispatchCommand, hasCommand, registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { BAR_DATA_COMMANDS } from '../contracts/bar-data-contracts.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import { SESSION_COMMANDS } from '../contracts/session-contracts.js';
import { createReplayChartSync } from './replay-chart-sync.js';
import {
  DEFAULT_PREFIX_BARS,
  MAX_PREFIX_BARS,
  MAX_DISPLAY_WINDOW_SEEK_ATTEMPTS,
  alignTimestampToTimeframe,
  assertNoDisplayBarsAfter,
  assertNoFutureDisplayBars,
  canRevealBar,
  cloneReplayValue as clone,
  computePrefixBarCount,
  createCountdownSnapshot,
  displayBarsEqual,
  earliestBarTimestamp,
  emptyReplayState,
  filterDisplayBarsForCursor,
  isoFromTimestamp,
  isAtOrAfterSessionEnd,
  mergeDisplayBarsForCursor,
  mergeSparseDisplayBars,
  normalizeStepCount,
  normalizeTimeframe,
  previousWindowAnchor,
  selectNextBar,
  selectStartBar,
  shouldSeekEarlierDisplayWindow,
  splitRetainedPrefixChunks,
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
  const setTimer = globalThis.setInterval?.bind(globalThis);
  const clearTimer = globalThis.clearInterval?.bind(globalThis);
  let state = emptyReplayState();
  let playback = {
    playing: false,
    intervalMs: 500,
    stepCount: 1,
    timerId: null,
    advancing: false,
    stoppedReason: null,
  };
  let initialLoadSequence = 0;
  let emit = () => {};
  const loadedPrefixAnchors = new Set();
  const loadingPrefixAnchors = new Set();
  const loadingDisplayWindowKeys = new Set();
  const chartSync = createReplayChartSync({
    getState: () => state,
    dispatchCommand,
    hasCommand,
    chartCommands: CHART_COMMANDS,
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
    loadedPrefixAnchors.clear();
    loadingPrefixAnchors.clear();

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

  async function loadDisplayWindow({
    sessionId = state.sessionId,
    displayTimeframe = state.displayTimeframe || state.session?.timeframe,
    anchor = state.cursorTimestamp,
    direction = 'backward',
    count,
    viewportDemand,
  } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (state.sessionId !== sessionId || state.status === 'idle') {
      await loadInitialSession({ sessionId });
    }
    const missingWindow = viewportDemand?.missingWindow || {};
    const normalizedDisplayTimeframe = normalizeTimeframe(
      viewportDemand?.displayTimeframe || displayTimeframe,
      'display timeframe'
    );
    const metrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS);
    const requestedCount = count ?? missingWindow.suggestedCount;
    const displayCount = Number.isInteger(Number(requestedCount))
      ? Number(requestedCount)
      : computePrefixBarCount(metrics) + 1;
    const normalizedCount = Math.min(Math.max(1, Math.ceil(displayCount)), MAX_PREFIX_BARS);
    const normalizedAnchor = missingWindow.anchor
      || isoFromTimestamp(alignTimestampToTimeframe(anchor, normalizedDisplayTimeframe));
    const normalizedDirection = missingWindow.direction || viewportDemand?.direction || direction;
    const demandKey = [
      sessionId,
      state.session.instrument,
      normalizedDisplayTimeframe,
      normalizedAnchor,
      normalizedDirection,
      normalizedCount,
    ].join('|');
    if (loadingDisplayWindowKeys.has(demandKey)) {
      return {
        ...clone(state),
        loaded: false,
        reason: 'duplicate-display-window-demand',
      };
    }

    loadingDisplayWindowKeys.add(demandKey);
    try {
      const displayContext = {
        cursorTimestamp: state.cursorTimestamp,
        displayTimeframe: normalizedDisplayTimeframe,
        replayTimeframe: state.replayTimeframe || state.session.timeframe,
      };
      const shouldMergeDisplayBars = state.displayBarsTimeframe === normalizedDisplayTimeframe;
      const currentEarliestTimestamp = earliestBarTimestamp(state.displayBars);
      const displayWindowAttempts = [];
      let nextAnchor = normalizedAnchor;
      let window = null;
      let windowDisplayBars = [];
      let accumulatedWindowDisplayBars = [];
      let displayBars = state.displayBars;

      for (let attempt = 0; attempt < MAX_DISPLAY_WINDOW_SEEK_ATTEMPTS; attempt += 1) {
        window = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
          instrument: state.session.instrument,
          timeframe: normalizedDisplayTimeframe,
          anchor: nextAnchor,
          direction: normalizedDirection,
          count: normalizedCount,
        });
        windowDisplayBars = filterDisplayBarsForCursor(window.bars, displayContext);
        accumulatedWindowDisplayBars = mergeDisplayBarsForCursor(
          accumulatedWindowDisplayBars,
          windowDisplayBars,
          displayContext
        );
        displayBars = shouldMergeDisplayBars
          ? mergeDisplayBarsForCursor(state.displayBars, accumulatedWindowDisplayBars, displayContext)
          : accumulatedWindowDisplayBars;
        const nextEarliestTimestamp = earliestBarTimestamp(windowDisplayBars);
        displayWindowAttempts.push({
          key: window.key,
          start: window.start,
          end: window.end,
          anchor: window.anchor,
          cached: Boolean(window.cached),
          barCount: window.bars.length,
          displayBarCount: windowDisplayBars.length,
          earliestTimestamp: Number.isFinite(nextEarliestTimestamp) ? nextEarliestTimestamp : null,
        });

        if (!shouldSeekEarlierDisplayWindow({
          direction: normalizedDirection,
          attempt,
          displayTimeframe: normalizedDisplayTimeframe,
          missingWindow,
          currentEarliestTimestamp,
          window,
          windowDisplayBars,
        })) {
          break;
        }
        nextAnchor = previousWindowAnchor(window, normalizedDisplayTimeframe);
      }

      const displayBarsChanged = !displayBarsEqual(state.displayBars, displayBars);
      if (displayBarsChanged) {
        await chartSync.renderDisplayBars(displayBars, state.cursorTimestamp);
        await chartSync.syncChartRightEdgeLimit(state.cursorTimestamp);
        await chartSync.syncChartDisplayContext({
          displayTimeframe: normalizedDisplayTimeframe,
          bars: displayBars,
        });
      }

      state = {
        ...state,
        displayTimeframe: normalizedDisplayTimeframe,
        displayBarsTimeframe: normalizedDisplayTimeframe,
        displayBars: clone(displayBars),
        viewportMetrics: clone(metrics),
        status: 'display-loaded',
      };
      const result = {
        ...clone(state),
        displayWindow: {
          key: window.key,
          instrument: window.instrument,
          timeframe: window.timeframe,
          start: window.start,
          end: window.end,
          anchor: window.anchor,
          direction: window.direction,
          estimatedBars: window.estimatedBars,
          cached: Boolean(window.cached),
          rendered: displayBarsChanged,
          attempts: displayWindowAttempts,
          seekAttempts: Math.max(0, displayWindowAttempts.length - 1),
        },
      };
      emit(REPLAY_EVENTS.DISPLAY_WINDOW_LOADED, result);
      emit(REPLAY_EVENTS.DISPLAY_RELOADED, result);
      return result;
    } finally {
      loadingDisplayWindowKeys.delete(demandKey);
    }
  }

  async function projectDisplayForCursor({
    sessionId = state.sessionId,
    displayTimeframe = state.displayTimeframe || state.session?.timeframe,
    cursorTimestamp = state.cursorTimestamp,
  } = {}) {
    const normalizedDisplayTimeframe = normalizeTimeframe(displayTimeframe, 'display timeframe');
    const normalizedReplayTimeframe = normalizeTimeframe(
      state.replayTimeframe || state.session?.timeframe,
      'replay timeframe'
    );
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      return clone(state);
    }
    return loadDisplayWindow({
      sessionId,
      displayTimeframe: normalizedDisplayTimeframe,
      anchor: isoFromTimestamp(alignTimestampToTimeframe(cursorTimestamp, normalizedDisplayTimeframe)),
      direction: 'backward',
    });
  }

  async function setDisplayTimeframe({
    sessionId = state.sessionId,
    displayTimeframe,
    count,
  } = {}) {
    const normalizedDisplayTimeframe = normalizeTimeframe(displayTimeframe, 'display timeframe');
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (state.sessionId !== sessionId || state.status === 'idle') {
      await loadInitialSession({ sessionId });
    }
    if (state.displayTimeframe === normalizedDisplayTimeframe && state.status === 'display-loaded') {
      return getDisplayContext();
    }
    state = {
      ...state,
      displayTimeframe: normalizedDisplayTimeframe,
    };
    emit(REPLAY_EVENTS.DISPLAY_TIMEFRAME_CHANGED, getDisplayContext());
    return loadDisplayWindow({
      sessionId,
      displayTimeframe: normalizedDisplayTimeframe,
      anchor: state.cursorTimestamp,
      direction: 'backward',
      count,
    });
  }

  function getDisplayContext() {
    return {
      sessionId: state.sessionId,
      replayTimeframe: state.replayTimeframe || state.session?.timeframe || null,
      displayTimeframe: state.displayTimeframe || state.session?.timeframe || null,
      cursorTimestamp: state.cursorTimestamp,
      displayBars: clone(state.displayBars),
      viewportMetrics: clone(state.viewportMetrics),
      status: state.status,
    };
  }

  async function loadPrefixDemand({ prefixDemand } = {}) {
    if (!state.session || !state.sessionId) {
      return {
        ...clone(state),
        loaded: false,
        reason: 'no-session',
      };
    }
    if (state.displayTimeframe !== state.replayTimeframe) {
      return {
        ...clone(state),
        loaded: false,
        reason: 'display-window-demand-active',
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
          instrument: window.instrument,
          timeframe: window.timeframe,
          start: window.start,
          end: window.end,
          anchor: window.anchor,
          direction: window.direction,
          estimatedBars: window.estimatedBars,
        },
      };
      const prefixChunks = [
        chunk,
        ...state.prefixChunks,
      ];
      const displayBars = mergeSparseDisplayBars(state.displayBars, prefixChunks, state.cursorTimestamp);
      await chartSync.renderDisplayBars(displayBars, state.cursorTimestamp);
      state = {
        ...state,
        prefixChunks,
        displayBars: clone(displayBars),
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

  async function applyPrefixRetention({ visibleRange } = {}) {
    if (state.displayTimeframe !== state.replayTimeframe) {
      return {
        ...clone(state),
        released: false,
        releasedPrefixChunks: [],
        reason: 'display-window-demand-active',
      };
    }
    if (!state.session || !state.prefixChunks.length) {
      return {
        ...clone(state),
        released: false,
        releasedPrefixChunks: [],
      };
    }

    const { retained, released, releaseBefore } = splitRetainedPrefixChunks(state.prefixChunks, visibleRange);
    if (!released.length) {
      return {
        ...clone(state),
        released: false,
        releasedPrefixChunks: [],
        releaseBefore,
      };
    }

    for (const chunk of released) {
      if (chunk.window) {
        await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_WINDOW, {
          instrument: chunk.window.instrument,
          timeframe: chunk.window.timeframe,
          anchor: chunk.window.anchor || chunk.anchor,
          direction: chunk.window.direction,
          count: chunk.window.estimatedBars,
        });
      }
      loadedPrefixAnchors.delete(chunk.anchor);
    }
    const displayBars = mergeSparseDisplayBars([
      ...state.prefixBars,
      state.startBar,
      ...state.displayBars.filter((bar) => Number(bar?.timestamp) >= Number(state.startBar?.timestamp)),
    ], retained, state.cursorTimestamp);
    await chartSync.renderDisplayBars(displayBars, state.cursorTimestamp);

    const releasedSummaries = released.map((chunk) => ({
      anchor: chunk.anchor,
      window: clone(chunk.window),
      barCount: chunk.bars?.length || 0,
    }));
    state = {
      ...state,
      prefixChunks: retained,
      releasedPrefixChunks: [
        ...state.releasedPrefixChunks,
        ...releasedSummaries,
      ],
      displayBars: clone(displayBars),
    };
    const result = {
      ...clone(state),
      released: true,
      releasedPrefixChunks: clone(releasedSummaries),
      releaseBefore,
    };
    emit(REPLAY_EVENTS.PREFIX_CHUNK_RELEASED, result);
    return result;
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
      await projectDisplayForCursor({
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
    pause();
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
      await projectDisplayForCursor({
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
    pause();
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
      await projectDisplayForCursor({
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
    pause();
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
      await projectDisplayForCursor({
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

  function playbackSnapshot() {
    return {
      playing: playback.playing,
      intervalMs: playback.intervalMs,
      stepCount: playback.stepCount,
      stoppedReason: playback.stoppedReason,
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
      const result = await next({ sessionId, stepCount: playback.stepCount || 1 });
      if (!result.advanced) {
        pause({ reason: result.reason || 'stopped' });
      }
    } finally {
      playback.advancing = false;
    }
  }

  function play({ sessionId = state.sessionId, intervalMs = 500, stepCount = 1 } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    const normalizedInterval = Number(intervalMs);
    if (!Number.isFinite(normalizedInterval) || normalizedInterval <= 0) {
      throw new Error('replay play intervalMs must be a positive number.');
    }
    const normalizedStepCount = normalizeStepCount(stepCount);
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
      stepCount: normalizedStepCount,
      timerId,
      stoppedReason: null,
    });
  }

  function pause({ reason = null } = {}) {
    if (playback.timerId !== null && typeof clearTimer === 'function') {
      clearTimer(playback.timerId);
    }
    return setPlayback({
      playing: false,
      timerId: null,
      stoppedReason: reason,
    });
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(REPLAY_COMMANDS.RESOLVE_START_BAR, (payload) => resolveStartBar(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_PREFIX, (payload) => loadInitialPrefix(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, (payload) => loadInitialSession(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_PREFIX_DEMAND, (payload) => loadPrefixDemand(payload)),
      registerCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, (payload) => setDisplayTimeframe(payload)),
      registerCommand(REPLAY_COMMANDS.GET_DISPLAY_CONTEXT, () => getDisplayContext()),
      registerCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, (payload) => loadDisplayWindow(payload)),
      registerCommand(REPLAY_COMMANDS.APPLY_PREFIX_RETENTION, (payload) => applyPrefixRetention(payload)),
      registerCommand(REPLAY_COMMANDS.NEXT, (payload) => next(payload)),
      registerCommand(REPLAY_COMMANDS.PREVIOUS, (payload) => previous(payload)),
      registerCommand(REPLAY_COMMANDS.TRUNCATE_TO_TIMESTAMP, (payload) => truncateToTimestamp(payload)),
      registerCommand(REPLAY_COMMANDS.PLAY, (payload) => play(payload)),
      registerCommand(REPLAY_COMMANDS.PAUSE, (payload) => pause(payload)),
      registerCommand(REPLAY_COMMANDS.RESET, (payload) => reset(payload)),
      registerCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE, () => playbackSnapshot()),
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
    pause();
    state = emptyReplayState();
    initialLoadSequence = 0;
    loadedPrefixAnchors.clear();
    loadingPrefixAnchors.clear();
  }

  return {
    id: 'runtime.replay',
    start,
    stop,
  };
}
