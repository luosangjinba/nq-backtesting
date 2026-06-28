export const FX_REPLAY_MODE = 'fx-replay';

export function normalizeFxReplayTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeTimeframe(timeframe, fallback = 1) {
  const value = Number(timeframe);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeInstrument(instrument, fallback = 'NQ') {
  const value = String(instrument || fallback).trim().toUpperCase();
  return value || fallback;
}

function normalizeBar(bar) {
  const timestamp = normalizeFxReplayTimestamp(bar?.timestamp);
  if (timestamp === null) return null;
  return {
    ...bar,
    timestamp,
  };
}

function sortBarsAscending(bars = []) {
  return bars
    .map(normalizeBar)
    .filter(Boolean)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function getLatestTimestamp(bars = []) {
  if (!bars.length) return null;
  return normalizeFxReplayTimestamp(bars[bars.length - 1]?.timestamp);
}

export function createFxReplaySessionState({
  sessionId = '',
  instrument = 'NQ',
  timeframe = 1,
  sessionStart = '',
  sessionEnd = '',
  retentionPolicy = null,
} = {}) {
  return {
    enabled: false,
    mode: FX_REPLAY_MODE,
    sessionId: String(sessionId || `fx-replay-${Date.now()}`),
    instrument: normalizeInstrument(instrument),
    timeframe: normalizeTimeframe(timeframe),
    sessionStart: String(sessionStart || '').trim(),
    sessionEnd: String(sessionEnd || '').trim(),
    startBarTimestamp: null,
    cursorTimestamp: null,
    prefixBars: [],
    startBar: null,
    revealedForwardBars: [],
    loaderCache: {
      startResolveBars: [],
      prefixChunks: [],
      revealChunks: [],
    },
    viewportDemandRange: null,
    retentionPolicy: retentionPolicy || {
      prefixBufferBars: 0,
      revealedBufferBars: 0,
    },
  };
}

export function applyFxReplayStartBar(state, bar) {
  const startBar = normalizeBar(bar);
  if (!startBar) {
    throw new Error('FX Replay start bar requires a timestamp');
  }
  state.enabled = true;
  state.startBar = startBar;
  state.startBarTimestamp = startBar.timestamp;
  state.cursorTimestamp = startBar.timestamp;
  state.revealedForwardBars = [];
  return state;
}

export function applyFxReplayPrefixBars(state, bars = []) {
  const cursorTimestamp = normalizeFxReplayTimestamp(state.cursorTimestamp);
  const startBarTimestamp = normalizeFxReplayTimestamp(state.startBarTimestamp);
  const hardEnd = cursorTimestamp ?? startBarTimestamp;
  state.prefixBars = sortBarsAscending(bars)
    .filter((bar) => hardEnd === null || bar.timestamp < hardEnd);
  return state;
}

export function setFxReplayViewportDemandRange(state, range = null) {
  state.viewportDemandRange = range && typeof range === 'object'
    ? { ...range }
    : null;
  return state;
}

export function addFxReplayLoaderCacheChunk(state, type, chunk = {}) {
  if (!state.loaderCache) {
    state.loaderCache = { startResolveBars: [], prefixChunks: [], revealChunks: [] };
  }
  if (type === 'start') {
    state.loaderCache.startResolveBars = sortBarsAscending(chunk.bars || []);
    return state;
  }
  if (type === 'prefix') {
    state.loaderCache.prefixChunks = [
      ...(state.loaderCache.prefixChunks || []),
      {
        ...chunk,
        bars: sortBarsAscending(chunk.bars || []),
      },
    ];
    return state;
  }
  if (type === 'reveal') {
    state.loaderCache.revealChunks = [
      ...(state.loaderCache.revealChunks || []),
      {
        ...chunk,
        bars: sortBarsAscending(chunk.bars || []),
      },
    ];
    return state;
  }
  throw new Error(`Unknown FX Replay loader cache chunk type: ${type}`);
}

export function getFxReplayInitialDisplayBars(state) {
  const startBar = normalizeBar(state.startBar);
  if (!startBar) return [];
  const prefixBars = sortBarsAscending(state.prefixBars)
    .filter((bar) => bar.timestamp < startBar.timestamp);
  return [...prefixBars, startBar];
}

export function getFxReplayPrefixRange(state) {
  const prefixBars = sortBarsAscending(state.prefixBars);
  if (!prefixBars.length) return null;
  return {
    start: prefixBars[0].timestamp,
    end: getLatestTimestamp(prefixBars),
    count: prefixBars.length,
  };
}

export function getFxReplayChangedPayload(state) {
  return {
    enabled: Boolean(state.enabled),
    sessionId: state.sessionId,
    instrument: state.instrument,
    timeframe: state.timeframe,
    sessionStart: state.sessionStart,
    sessionEnd: state.sessionEnd,
    startBarTimestamp: state.startBarTimestamp,
    cursorTimestamp: state.cursorTimestamp,
    prefixRange: getFxReplayPrefixRange(state),
    revealedCount: Array.isArray(state.revealedForwardBars) ? state.revealedForwardBars.length : 0,
    mode: FX_REPLAY_MODE,
  };
}

export function assertFxReplayInitialInvariants(state) {
  const displayBars = getFxReplayInitialDisplayBars(state);
  const cursorTimestamp = normalizeFxReplayTimestamp(state.cursorTimestamp);
  const startBarTimestamp = normalizeFxReplayTimestamp(state.startBarTimestamp);
  const latestDisplayTimestamp = getLatestTimestamp(displayBars);

  if (startBarTimestamp === null || cursorTimestamp === null) {
    throw new Error('FX Replay initial state requires start and cursor timestamps');
  }
  if (cursorTimestamp !== startBarTimestamp) {
    throw new Error('FX Replay initial cursor must equal start bar timestamp');
  }
  if (latestDisplayTimestamp !== startBarTimestamp) {
    throw new Error('FX Replay start bar must be the latest initial display bar');
  }
  if (displayBars.some((bar) => bar.timestamp > cursorTimestamp)) {
    throw new Error('FX Replay initial display bars must not include future bars');
  }
  if (Array.isArray(state.revealedForwardBars) && state.revealedForwardBars.length > 0) {
    throw new Error('FX Replay initial state must not expose revealed forward bars');
  }
  return true;
}
