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
    ({ result, cacheHit } = await loadBarsWindow(request.start, request.end, request.timeframe, request.instrument));
    visibleBars = getReplaySessionVisibleBarsFromResult(result, request);
  }
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

export async function loadPreviousReplaySessionPrefix({ chunkBars } = {}) {
  const session = getActiveReplaySession();
  if (!session) return { ok: false, message: 'No active replay session' };

  const planned = planPreviousPrefixRequest(session, { chunkBars });
  if (!planned.ok) return { ok: false, message: planned.message };

  const { request } = planned;
  const { result, cacheHit } = await loadBarsWindow(request.start, request.end, request.timeframe, request.instrument);
  const prefixBars = getReplaySessionVisibleBarsFromResult(result, request);
  if (!prefixBars.length) {
    return { ok: false, message: 'No older replay prefix bars found', request, cacheHit };
  }

  const existingBars = store.getDisplayBars();
  const previousRange = getVisibleLogicalRange();
  const mergedBars = mergeBarsByTimestamp(existingBars, prefixBars);
  const addedBars = Math.max(0, mergedBars.length - existingBars.length);
  const sessionWithChunk = addReplaySessionChunk(session, {
    reason: request.reason,
    startTs: request.startTs,
    endTs: request.endTs,
  });
  const requestedRange = {
    startTs: Number(mergedBars[0]?.timestamp ?? request.startTs),
    endTs: sessionWithChunk.cursor,
  };

  setActiveReplaySession(sessionWithChunk);
  store.setBars(mergedBars, request.start, formatReplaySessionDateTime(sessionWithChunk.cursor), request.timeframe, requestedRange, {
    instrument: request.instrument,
    outerRange: null,
  });
  if (
    previousRange &&
    addedBars > 0 &&
    Number.isFinite(previousRange.from) &&
    Number.isFinite(previousRange.to)
  ) {
    setVisibleLogicalRange(previousRange.from + addedBars, previousRange.to + addedBars);
  }
  emitReplaySessionChanged(sessionWithChunk, mergedBars);

  return {
    ok: true,
    session: sessionWithChunk,
    request,
    bars: mergedBars,
    prefixBars,
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
