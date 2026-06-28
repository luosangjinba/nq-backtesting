import * as bus from '../../event-bus.js';
import * as store from '../../data/bar-store.js';
import { loadBarsWindow } from '../../data/load-bars-window.js';
import { getVisibleBarCapacity } from '../../chart/chart-manager.js';
import {
  addReplaySessionChunk,
  createReplaySession,
  planInitialPrefixRequest,
  setActiveReplaySession,
} from './replay-session-state.js';

function filterBarsToRequest(bars, request) {
  const startTs = Number(request?.startTs);
  const endTs = Number(request?.endTs);
  if (!Array.isArray(bars) || !Number.isFinite(startTs) || !Number.isFinite(endTs)) return [];
  return bars.filter((bar) => {
    const timestamp = Number(bar?.timestamp);
    return Number.isFinite(timestamp) && timestamp >= startTs && timestamp <= endTs;
  });
}

export function getReplaySessionVisibleBarsFromResult(result, request) {
  return filterBarsToRequest(result?.bars, request);
}

export async function openReplaySessionFromRange({
  instrument,
  timeframe,
  sessionStart,
  sessionEnd,
  viewportBarCapacity = getVisibleBarCapacity(),
  paddingBars,
} = {}) {
  const session = createReplaySession({
    instrument,
    timeframe,
    sessionStart,
    sessionEnd,
    cursor: sessionStart,
  });
  const planned = planInitialPrefixRequest(session, {
    viewportBarCapacity,
    paddingBars,
  });
  if (!planned.ok) {
    throw new Error(planned.message || 'Replay session initial prefix request failed');
  }

  const { request } = planned;
  const { result, cacheHit } = await loadBarsWindow(request.start, request.end, request.timeframe, request.instrument);
  const visibleBars = getReplaySessionVisibleBarsFromResult(result, request);
  const sessionWithChunk = addReplaySessionChunk(session, {
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
  bus.emit('replay:changed', {
    enabled: true,
    cursorIndex: Math.max(0, visibleBars.length - 1),
    cursorTimestamp: sessionWithChunk.cursor,
    speedIndex: 0,
    session: sessionWithChunk,
  });

  return {
    session: sessionWithChunk,
    request,
    bars: visibleBars,
    result,
    cacheHit,
  };
}
