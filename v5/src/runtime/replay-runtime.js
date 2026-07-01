import { dispatchCommand, hasCommand, registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { BAR_DATA_COMMANDS } from '../contracts/bar-data-contracts.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import { SESSION_COMMANDS } from '../contracts/session-contracts.js';

export { REPLAY_COMMANDS, REPLAY_EVENTS };

const DEFAULT_PREFIX_BARS = 119;
const MAX_PREFIX_BARS = 499;
const PREFIX_RETENTION_VISIBLE_SPANS = 2;

function emptyState() {
  return {
    sessionId: null,
    session: null,
    persistedCursor: null,
    startBar: null,
    startBarTimestamp: null,
    cursorTimestamp: null,
    revealedCount: 0,
    replayTimeframe: null,
    displayTimeframe: null,
    displayBarsTimeframe: null,
    prefixBars: [],
    prefixChunks: [],
    releasedPrefixChunks: [],
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

function normalizeTimeframe(value, fieldName = 'replay timeframe') {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive number.`);
  }
  return normalized;
}

function timeframeSeconds(timeframe) {
  return normalizeTimeframe(timeframe) * 60;
}

function isoFromTimestamp(timestampValue) {
  return new Date(timestampValue * 1000).toISOString();
}

function alignTimestampToTimeframe(value, timeframe) {
  const timestamp = timestampSeconds(value);
  const seconds = timeframeSeconds(timeframe);
  return Math.floor(timestamp / seconds) * seconds;
}

export function isDisplayBarAllowed(bar, {
  cursorTimestamp,
  displayTimeframe,
  replayTimeframe,
} = {}) {
  const barTimestamp = Number(bar?.timestamp);
  if (!Number.isFinite(barTimestamp)) return false;
  const cursor = timestampSeconds(cursorTimestamp);
  const displayTf = normalizeTimeframe(displayTimeframe, 'display timeframe');
  const replayTf = normalizeTimeframe(replayTimeframe, 'replay timeframe');
  if (displayTf > replayTf) {
    return barTimestamp + timeframeSeconds(displayTf) <= cursor;
  }
  return barTimestamp <= cursor;
}

function filterDisplayBarsForCursor(bars = [], context = {}) {
  return bars
    .filter((bar) => isDisplayBarAllowed(bar, context))
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}

function mergeDisplayBarsForCursor(existingBars = [], nextBars = [], context = {}) {
  return filterDisplayBarsForCursor([...new Map([
    ...existingBars,
    ...nextBars,
  ]
    .map((bar) => [Number(bar?.timestamp), bar]))
    .values()], context);
}

export function computePrefixBarCount(metrics = {}) {
  const estimatedVisibleBars = Number(metrics?.estimatedVisibleBars);
  if (!Number.isFinite(estimatedVisibleBars) || estimatedVisibleBars <= 1) {
    return DEFAULT_PREFIX_BARS;
  }
  return Math.min(Math.max(1, Math.floor(estimatedVisibleBars) - 1), MAX_PREFIX_BARS);
}

export function assertNoFutureDisplayBars(displayBars = [], startBar) {
  return assertNoDisplayBarsAfter(displayBars, startBar);
}

export function assertNoDisplayBarsAfter(displayBars = [], cursorBarOrTimestamp) {
  const rawTimestamp = typeof cursorBarOrTimestamp === 'object'
    ? cursorBarOrTimestamp?.timestamp
    : cursorBarOrTimestamp;
  const cursorTimestamp = typeof rawTimestamp === 'number'
    ? rawTimestamp
    : timestampSeconds(rawTimestamp);
  if (!Number.isFinite(cursorTimestamp)) {
    throw new Error('replay cursor timestamp is required.');
  }
  const futureBar = displayBars.find((bar) => Number(bar?.timestamp) > cursorTimestamp);
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

export function mergeSparseDisplayBars(displayBars = [], prefixChunks = [], cursorTimestamp) {
  const cursor = timestampSeconds(cursorTimestamp);
  return [...new Map([
    ...prefixChunks.flatMap((chunk) => chunk.bars || []),
    ...displayBars,
  ]
    .filter((bar) => Number(bar?.timestamp) <= cursor)
    .map((bar) => [Number(bar.timestamp), bar]))
    .values()]
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}

export function splitRetainedPrefixChunks(prefixChunks = [], visibleRange = {}) {
  const from = Number(visibleRange.from);
  const to = Number(visibleRange.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return {
      retained: prefixChunks,
      released: [],
      releaseBefore: null,
    };
  }

  const visibleSpan = to - from;
  const releaseBefore = from - (visibleSpan * PREFIX_RETENTION_VISIBLE_SPANS);
  const retained = [];
  const released = [];
  for (const chunk of prefixChunks) {
    const latestTimestamp = Math.max(
      ...((chunk.bars || []).map((bar) => Number(bar?.timestamp)).filter(Number.isFinite))
    );
    if (Number.isFinite(latestTimestamp) && latestTimestamp < releaseBefore) {
      released.push(chunk);
    } else {
      retained.push(chunk);
    }
  }
  return {
    retained,
    released,
    releaseBefore,
  };
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
    stoppedReason: null,
  };
  let emit = () => {};
  const loadedPrefixAnchors = new Set();
  const loadingPrefixAnchors = new Set();
  const loadingDisplayWindowKeys = new Set();

  async function syncChartRightEdgeLimit(rightEdge) {
    if (hasCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT)) {
      await dispatchCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, { rightEdge });
    }
  }

  async function syncChartDisplayContext({ displayTimeframe, bars }) {
    if (!hasCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT)) return;
    const timestamps = (bars || [])
      .map((bar) => Number(bar?.timestamp))
      .filter(Number.isFinite)
      .sort((left, right) => left - right);
    await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
      instrument: state.session?.instrument || null,
      displayTimeframe,
      loadedCoverage: timestamps.length
        ? { from: timestamps[0], to: timestamps[timestamps.length - 1] }
        : null,
    });
  }

  async function syncChartViewportFollow(cursorTimestamp) {
    if (!hasCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW)) return null;
    const metrics = hasCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS)
      ? await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS).catch(() => null)
      : null;
    return dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, {
      enabled: true,
      cursorTimestamp,
      estimatedVisibleBars: metrics?.estimatedVisibleBars || state.viewportMetrics?.estimatedVisibleBars || null,
    });
  }

  async function renderDisplayBars(displayBars, cursorTimestamp = state.cursorTimestamp) {
    await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars: displayBars });
    await syncChartViewportFollow(cursorTimestamp);
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

  async function resolveStartBar({ sessionId } = {}) {
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

  async function loadPersistedRevealBars(cursor) {
    if (!cursor?.cursorTimestamp || !state.startBar) return [];
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

    const persistedRevealBars = await loadPersistedRevealBars(state.persistedCursor);
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
    await renderDisplayBars(displayBars, restoredCursorTimestamp);
    await syncChartRightEdgeLimit(restoredCursorTimestamp);
    await syncChartDisplayContext({
      displayTimeframe: state.displayTimeframe || state.session.timeframe,
      bars: displayBars,
    });

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
      const window = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
        instrument: state.session.instrument,
        timeframe: normalizedDisplayTimeframe,
        anchor: normalizedAnchor,
        direction: normalizedDirection,
        count: normalizedCount,
      });
      const displayContext = {
        cursorTimestamp: state.cursorTimestamp,
        displayTimeframe: normalizedDisplayTimeframe,
        replayTimeframe: state.replayTimeframe || state.session.timeframe,
      };
      const windowDisplayBars = filterDisplayBarsForCursor(window.bars, displayContext);
      const shouldMergeDisplayBars = state.displayBarsTimeframe === normalizedDisplayTimeframe;
      const displayBars = shouldMergeDisplayBars
        ? mergeDisplayBarsForCursor(state.displayBars, windowDisplayBars, displayContext)
        : windowDisplayBars;
      await renderDisplayBars(displayBars, state.cursorTimestamp);
      await syncChartRightEdgeLimit(state.cursorTimestamp);
      await syncChartDisplayContext({
        displayTimeframe: normalizedDisplayTimeframe,
        bars: displayBars,
      });

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
      await renderDisplayBars(displayBars, state.cursorTimestamp);
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
    await renderDisplayBars(displayBars, state.cursorTimestamp);

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
      await renderDisplayBars(displayBars, nextBar.time);
      await syncChartRightEdgeLimit(nextBar.time);
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
      await syncChartRightEdgeLimit(nextBar.time);
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

  async function previous({ sessionId = state.sessionId } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
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
      await renderDisplayBars(displayBars, previousCursorBar.time);
      await syncChartRightEdgeLimit(previousCursorBar.time);
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
      await syncChartRightEdgeLimit(previousCursorBar.time);
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
      await renderDisplayBars(displayBars, selectedBar.time);
      await syncChartRightEdgeLimit(selectedBar.time);
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
      await syncChartRightEdgeLimit(selectedBar.time);
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
      await renderDisplayBars(displayBars, state.startBar.time);
      await syncChartRightEdgeLimit(state.startBar.time);
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
      await syncChartRightEdgeLimit(state.startBar.time);
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
      const result = await next({ sessionId });
      if (!result.advanced) {
        pause({ reason: result.reason || 'stopped' });
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
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => clone(state)),
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
