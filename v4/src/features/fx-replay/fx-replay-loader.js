const MINUTE_MS = 60 * 1000;

export const FX_REPLAY_REQUEST_TYPES = Object.freeze({
  START_RESOLVE: 'start-resolve',
  PREFIX: 'prefix',
});

function normalizeTimeframe(timeframe, fallback = 1) {
  const value = Number(timeframe);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeInstrument(instrument, fallback = 'NQ') {
  const value = String(instrument || fallback).trim().toUpperCase();
  return value || fallback;
}

export function parseFxReplayDateTime(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0)
  );
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatFxReplayDateTime(timestampMs) {
  const timestamp = Number(timestampMs);
  if (!Number.isFinite(timestamp)) {
    throw new Error('FX Replay date format requires a finite timestamp');
  }
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function getFxReplayTimestampMsFromSeconds(timestamp) {
  const value = Number(timestamp);
  return Number.isFinite(value) ? value * 1000 : null;
}

export function buildFxReplayStartResolveRequest({
  sessionStart,
  timeframe = 1,
  instrument = 'NQ',
} = {}) {
  const startMs = parseFxReplayDateTime(sessionStart);
  const tf = normalizeTimeframe(timeframe);
  if (startMs === null) {
    throw new Error('FX Replay start resolve requires a valid sessionStart');
  }
  return {
    type: FX_REPLAY_REQUEST_TYPES.START_RESOLVE,
    reason: 'resolve-start-bar',
    instrument: normalizeInstrument(instrument),
    timeframe: tf,
    start: formatFxReplayDateTime(startMs),
    end: formatFxReplayDateTime(startMs + tf * MINUTE_MS),
  };
}

export function buildFxReplayPrefixRequest({
  startBarTimestamp,
  prefixBars = 300,
  timeframe = 1,
  instrument = 'NQ',
} = {}) {
  const startBarMs = getFxReplayTimestampMsFromSeconds(startBarTimestamp);
  const tf = normalizeTimeframe(timeframe);
  const count = Math.max(1, Math.floor(Number(prefixBars) || 1));
  if (startBarMs === null) {
    throw new Error('FX Replay prefix request requires startBarTimestamp');
  }
  const endMs = startBarMs - tf * MINUTE_MS;
  const startMs = endMs - (count - 1) * tf * MINUTE_MS;
  return {
    type: FX_REPLAY_REQUEST_TYPES.PREFIX,
    reason: 'initial-visible-prefix',
    instrument: normalizeInstrument(instrument),
    timeframe: tf,
    start: formatFxReplayDateTime(startMs),
    end: formatFxReplayDateTime(endMs),
    requestedBars: count,
    hardEndTimestamp: Number(startBarTimestamp),
  };
}

export function planFxReplayInitialRequests({
  instrument = 'NQ',
  timeframe = 1,
  sessionStart = '',
  startBarTimestamp = null,
  prefixBars = 300,
} = {}) {
  const requests = [
    buildFxReplayStartResolveRequest({ sessionStart, timeframe, instrument }),
  ];
  if (startBarTimestamp !== null && startBarTimestamp !== undefined && Number.isFinite(Number(startBarTimestamp))) {
    requests.push(buildFxReplayPrefixRequest({
      startBarTimestamp,
      prefixBars,
      timeframe,
      instrument,
    }));
  }
  return requests;
}

export function assertFxReplayInitialRequestPlan(requests = [], {
  sessionStart = '',
  sessionEnd = '',
  startBarTimestamp = null,
} = {}) {
  const list = Array.isArray(requests) ? requests : [];
  if (!list.length) {
    throw new Error('FX Replay initial request plan is empty');
  }
  const fullRangeKey = `${String(sessionStart).trim()}|${String(sessionEnd).trim()}`;
  for (const request of list) {
    if (!request?.type || !request.start || !request.end) {
      throw new Error('FX Replay request plan contains an invalid request');
    }
    const requestKey = `${request.start}|${request.end}`;
    if (sessionStart && sessionEnd && requestKey === fullRangeKey) {
      throw new Error('FX Replay initial request plan must not load the full date range');
    }
    if (request.type === FX_REPLAY_REQUEST_TYPES.PREFIX) {
      const startBarMs = getFxReplayTimestampMsFromSeconds(startBarTimestamp ?? request.hardEndTimestamp);
      const endMs = parseFxReplayDateTime(request.end);
      if (startBarMs === null || endMs === null || endMs >= startBarMs) {
        throw new Error('FX Replay prefix request must end before the start bar');
      }
    }
  }
  return true;
}
