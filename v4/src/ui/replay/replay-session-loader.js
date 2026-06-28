import * as bus from '../../event-bus.js';
import * as store from '../../data/bar-store.js';
import { loadBarsWindow } from '../../data/load-bars-window.js';
import { getVisibleBarCapacity, getVisibleLogicalRange, setVisibleLogicalRange } from '../../chart/chart-manager.js';
import {
  addReplaySessionChunk,
  createReplaySession,
  formatReplaySessionDateTime,
  getActiveReplaySession,
  planInitialPrefixRequest,
  planNextForwardBarRequest,
  planPreviousPrefixRequest,
  setActiveReplaySession,
} from './replay-session-state.js';

const INITIAL_CURSOR_SEARCH_SECONDS = 7 * 24 * 60 * 60;
const PREFIX_EMPTY_SCAN_LIMIT = 24;

function filterBarsToRequest(bars, request) {
  const startTs = Number(request?.startTs);
  const endTs = Number(request?.endTs);
  if (!Array.isArray(bars) || !Number.isFinite(startTs) || !Number.isFinite(endTs)) return [];
  return bars.filter((bar) => {
    const timestamp = Number(bar?.timestamp);
    return Number.isFinite(timestamp) && timestamp >= startTs && timestamp <= endTs;
  });
}

function findFirstBarInSession(result, session) {
  return (Array.isArray(result?.bars) ? result.bars : [])
    .filter((bar) => {
      const timestamp = Number(bar?.timestamp);
      return Number.isFinite(timestamp) && timestamp >= session.sessionStart && timestamp <= session.sessionEnd;
    })
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0] || null;
}

function shiftPrefixRequestEarlier(request, timeframeSeconds) {
  const widthSeconds = Math.max(timeframeSeconds, Number(request.endTs) - Number(request.startTs));
  const endTs = Number(request.startTs) - timeframeSeconds;
  const startTs = endTs - widthSeconds;
  return {
    ...request,
    startTs,
    endTs,
    start: formatReplaySessionDateTime(startTs),
    end: formatReplaySessionDateTime(endTs),
  };
}

export function getReplaySessionVisibleBarsFromResult(result, request) {
  return filterBarsToRequest(result?.bars, request);
}

function mergeBarsByTimestamp(existingBars, prefixBars) {
  const byTimestamp = new Map();
  [...prefixBars, ...existingBars].forEach((bar) => {
    const timestamp = Number(bar?.timestamp);
    if (!Number.isFinite(timestamp)) return;
    byTimestamp.set(timestamp, bar);
  });
  return [...byTimestamp.values()].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

function trimBarsAroundLogicalRange(bars, range, retentionBars = 0) {
  if (!Array.isArray(bars) || !bars.length || !range) {
    return { bars, droppedBefore: 0, range };
  }
  const from = Number(range.from);
  const to = Number(range.to);
  const retention = Math.max(0, Math.floor(Number(retentionBars) || 0));
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return { bars, droppedBefore: 0, range };
  }
  const keepFrom = Math.max(0, Math.floor(from) - retention);
  const keepTo = Math.min(bars.length - 1, Math.ceil(to) + retention);
  if (keepFrom === 0 && keepTo === bars.length - 1) {
    return { bars, droppedBefore: 0, range };
  }
  const nextBars = bars.slice(keepFrom, keepTo + 1);
  return {
    bars: nextBars,
    droppedBefore: keepFrom,
    range: {
      from: from - keepFrom,
      to: to - keepFrom,
    },
  };
}

export function getPrefixAdjustedLogicalRange(previousRange, addedBars) {
  if (
    !previousRange ||
    !Number.isFinite(Number(previousRange.from)) ||
    !Number.isFinite(Number(previousRange.to))
  ) {
    return null;
  }

  const from = Number(previousRange.from);
  const to = Number(previousRange.to);
  const width = to - from;
  if (!Number.isFinite(width) || width <= 0) return null;

  if (from < 0) {
    const nextFrom = Math.min(0, from + Math.max(0, addedBars));
    return {
      from: nextFrom,
      to: nextFrom + width,
    };
  }

  return {
    from: from + addedBars,
    to: to + addedBars,
  };
}

function emitReplaySessionChanged(session, bars) {
  bus.emit('replay:changed', {
    enabled: true,
    cursorIndex: Math.max(0, bars.length - 1),
    cursorTimestamp: session.cursor,
    speedIndex: 0,
    session,
  });
}

async function resolveFirstAvailableSessionCursor(session) {
  const searchEndTs = Math.min(session.sessionEnd, session.sessionStart + INITIAL_CURSOR_SEARCH_SECONDS);
  if (searchEndTs <= session.sessionStart) return null;
  const { result } = await loadBarsWindow(
    formatReplaySessionDateTime(session.sessionStart),
    formatReplaySessionDateTime(searchEndTs),
    session.timeframe,
    session.instrument
  );
  const firstBar = findFirstBarInSession(result, session);
  return firstBar ? Number(firstBar.timestamp) : null;
}

async function loadPrefixWindowWithBackfill(request, targetBarCount = 1) {
  const timeframeSeconds = Math.max(60, Number(request.timeframe) * 60);
  const loadedResults = [];
  let activeRequest = request;
  let cacheHit = false;
  let mergedBars = [];
  let mergedStartTs = Number(request.startTs);

  for (let attempt = 0; attempt < PREFIX_EMPTY_SCAN_LIMIT; attempt += 1) {
    const loaded = await loadBarsWindow(activeRequest.start, activeRequest.end, activeRequest.timeframe, activeRequest.instrument);
    cacheHit = cacheHit || Boolean(loaded.cacheHit);
    loadedResults.push(loaded.result);
    const visibleBars = getReplaySessionVisibleBarsFromResult(loaded.result, activeRequest);
    if (visibleBars.length) {
      mergedBars = mergeBarsByTimestamp(mergedBars, visibleBars);
      mergedStartTs = Math.min(mergedStartTs, Number(activeRequest.startTs));
      if (mergedBars.length >= targetBarCount) {
        break;
      }
    }
    activeRequest = shiftPrefixRequestEarlier(activeRequest, timeframeSeconds);
  }

  return {
    request: {
      ...request,
      startTs: mergedStartTs,
      start: formatReplaySessionDateTime(mergedStartTs),
    },
    result: loadedResults[0] || { bars: [], requestedRange: null },
    cacheHit,
    visibleBars: mergedBars,
    scannedResults: loadedResults,
  };
}

export async function openReplaySessionFromRange({
  instrument,
  timeframe,
  sessionStart,
  sessionEnd,
  cursor = sessionStart,
  viewportBarCapacity = getVisibleBarCapacity(),
  paddingBars,
} = {}) {
  const session = createReplaySession({
    instrument,
    timeframe,
    sessionStart,
    sessionEnd,
    cursor,
  });
  const planned = planInitialPrefixRequest(session, {
    viewportBarCapacity,
    paddingBars,
  });
  if (!planned.ok) {
    throw new Error(planned.message || 'Replay session initial prefix request failed');
  }

  let { request } = planned;
  let { result, cacheHit } = await loadBarsWindow(request.start, request.end, request.timeframe, request.instrument);
  let visibleBars = getReplaySessionVisibleBarsFromResult(result, request);
  let sessionForChunk = session;
  if (!visibleBars.length) {
    const resolvedCursor = await resolveFirstAvailableSessionCursor(session);
    if (resolvedCursor === null) {
      throw new Error('No replay bars found in selected date range');
    }
    sessionForChunk = createReplaySession({
      ...session,
      cursor: resolvedCursor,
    });
    const resolvedPlan = planInitialPrefixRequest(sessionForChunk, {
      viewportBarCapacity,
      paddingBars,
    });
    if (!resolvedPlan.ok) {
      throw new Error(resolvedPlan.message || 'Replay session initial prefix request failed');
    }
    request = resolvedPlan.request;
  }
  const targetBarCount = Math.max(1, Math.floor(Number(viewportBarCapacity) || 0) + Math.floor(Number(paddingBars ?? 40)));
  const loadedPrefix = await loadPrefixWindowWithBackfill(request, targetBarCount);
  ({ result, cacheHit, visibleBars } = loadedPrefix);
  request = loadedPrefix.request;
  if (!visibleBars.length) {
    throw new Error('No replay bars found in selected date range');
  }
  const sessionWithChunk = addReplaySessionChunk(sessionForChunk, {
    reason: request.reason,
    startTs: request.startTs,
    endTs: request.endTs,
  });

  setActiveReplaySession(sessionWithChunk);
  store.setBars(visibleBars, request.start, request.end, request.timeframe, {
    startTs: request.startTs,
    endTs: request.endTs,
  }, {
    instrument: request.instrument,
    outerRange: null,
  });
  emitReplaySessionChanged(sessionWithChunk, visibleBars);

  return {
    session: sessionWithChunk,
    request,
    bars: visibleBars,
    result,
    cacheHit,
  };
}

export async function reloadReplaySessionTimeframe({
  timeframe,
  viewportBarCapacity = getVisibleBarCapacity(),
  paddingBars,
} = {}) {
  const activeSession = getActiveReplaySession();
  if (!activeSession) return { ok: false, message: 'No active replay session' };

  return openReplaySessionFromRange({
    instrument: activeSession.instrument,
    timeframe,
    sessionStart: activeSession.sessionStart,
    sessionEnd: activeSession.sessionEnd,
    cursor: activeSession.cursor,
    viewportBarCapacity,
    paddingBars,
  });
}

export async function loadPreviousReplaySessionPrefix({
  chunkBars,
  visibleLogicalRange = null,
  retentionBars = 0,
} = {}) {
  const session = getActiveReplaySession();
  if (!session) return { ok: false, message: 'No active replay session' };

  const planned = planPreviousPrefixRequest(session, { chunkBars });
  if (!planned.ok) return { ok: false, message: planned.message };

  const { request } = planned;
  const targetBarCount = Math.max(1, Math.floor(Number(chunkBars) || 0));
  const { cacheHit, visibleBars: prefixBars, request: loadedRequest } = await loadPrefixWindowWithBackfill(request, targetBarCount);
  if (!prefixBars.length) {
    return { ok: false, message: 'No older replay prefix bars found', request, cacheHit };
  }

  const existingBars = store.getDisplayBars();
  const previousRange = visibleLogicalRange || getVisibleLogicalRange();
  const mergedBars = mergeBarsByTimestamp(existingBars, prefixBars);
  const addedBars = Math.max(0, mergedBars.length - existingBars.length);
  const shiftedRange = getPrefixAdjustedLogicalRange(previousRange, addedBars);
  const trimmed = trimBarsAroundLogicalRange(mergedBars, shiftedRange, retentionBars);
  const nextBars = trimmed.bars;
  const sessionWithChunk = addReplaySessionChunk(session, {
    reason: loadedRequest.reason,
    startTs: loadedRequest.startTs,
    endTs: loadedRequest.endTs,
  });
  const requestedRange = {
    startTs: Number(nextBars[0]?.timestamp ?? loadedRequest.startTs),
    endTs: Number(nextBars[nextBars.length - 1]?.timestamp ?? sessionWithChunk.cursor),
  };

  setActiveReplaySession(sessionWithChunk);
  store.setBars(nextBars, formatReplaySessionDateTime(requestedRange.startTs), formatReplaySessionDateTime(requestedRange.endTs), loadedRequest.timeframe, requestedRange, {
    instrument: loadedRequest.instrument,
    outerRange: null,
  });
  if (trimmed.range) {
    setVisibleLogicalRange(trimmed.range.from, trimmed.range.to);
  }
  emitReplaySessionChanged(sessionWithChunk, nextBars);

  return {
    ok: true,
    session: sessionWithChunk,
    request: loadedRequest,
    bars: nextBars,
    prefixBars,
    droppedBars: Math.max(0, mergedBars.length - nextBars.length),
    cacheHit,
  };
}

export async function loadNextReplaySessionBar() {
  const session = getActiveReplaySession();
  if (!session) return { ok: false, message: 'No active replay session' };

  const planned = planNextForwardBarRequest(session);
  if (!planned.ok) return { ok: false, message: planned.message, finished: planned.finished };

  const { request } = planned;
  const { result, cacheHit } = await loadBarsWindow(request.start, request.end, request.timeframe, request.instrument);
  const nextBar = (Array.isArray(result?.bars) ? result.bars : [])
    .filter((bar) => {
      const timestamp = Number(bar?.timestamp);
      return Number.isFinite(timestamp) && timestamp > session.cursor && timestamp <= session.sessionEnd;
    })
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0] || null;
  if (!nextBar) {
    return { ok: false, message: 'No next replay bar found', request, cacheHit };
  }

  const existingBars = store.getDisplayBars();
  const mergedBars = mergeBarsByTimestamp(existingBars, [nextBar]);
  const sessionWithChunk = addReplaySessionChunk({
    ...session,
    cursor: Number(nextBar.timestamp),
  }, {
    reason: request.reason,
    startTs: Number(nextBar.timestamp),
    endTs: Number(nextBar.timestamp),
  });
  const requestedRange = {
    startTs: Number(mergedBars[0]?.timestamp ?? request.startTs),
    endTs: sessionWithChunk.cursor,
  };

  setActiveReplaySession(sessionWithChunk);
  store.setBars(mergedBars, formatReplaySessionDateTime(requestedRange.startTs), formatReplaySessionDateTime(sessionWithChunk.cursor), request.timeframe, requestedRange, {
    instrument: request.instrument,
    outerRange: null,
  });
  emitReplaySessionChanged(sessionWithChunk, mergedBars);

  return {
    ok: true,
    session: sessionWithChunk,
    request,
    bars: mergedBars,
    nextBar,
    cacheHit,
  };
}
