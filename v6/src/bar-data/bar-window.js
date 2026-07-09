import {
  normalizeMinuteTimeframe,
  normalizeUnixMilliseconds,
  TIME_DOMAIN_CONSTANTS,
  toApiMinuteTime,
} from '../time-domain/time-domain.js';

const DEFAULT_BAR_COUNT = 120;
const DEFAULT_MAX_BARS_PER_WINDOW = 500;

function normalizeText(value, fallback, fieldName) {
  const normalized = String(value || fallback || '').trim();
  if (!normalized) {
    throw new Error(`Bar data ${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

export function normalizeInstrument(instrument = 'NQ') {
  return normalizeText(instrument, 'NQ', 'instrument').toUpperCase();
}

export const normalizeTimeframe = (timeframe = 1) => {
  try {
    return normalizeMinuteTimeframe(timeframe, {
      allowSuffix: false,
      fieldName: 'Bar data timeframe',
    });
  } catch {
    throw new Error('Bar data timeframe must be a positive integer.');
  }
};

export function parseBarTimeMs(value, fieldName = 'time') {
  try {
    return normalizeUnixMilliseconds(value, { fieldName: `Bar data ${fieldName}` });
  } catch {
    throw new Error(`Bar data ${fieldName} must be a valid date/time.`);
  }
}

export function formatApiTime(timestampMs) {
  return toApiMinuteTime(timestampMs);
}

export function estimateWindowBars(startMs, endMs, timeframe) {
  return Math.floor(
    (endMs - startMs) / (normalizeTimeframe(timeframe) * TIME_DOMAIN_CONSTANTS.MINUTE_MS)
  ) + 1;
}

export function makeBarWindowKey(window) {
  return [
    window.instrument,
    window.timeframe,
    window.start,
    window.end,
  ].join('|');
}

export function planBarWindow(payload = {}, options = {}) {
  const maxBarsPerWindow = Number(options.maxBarsPerWindow || DEFAULT_MAX_BARS_PER_WINDOW);
  const instrument = normalizeInstrument(payload.instrument);
  const timeframe = normalizeTimeframe(payload.timeframe);
  const count = Number(payload.count || DEFAULT_BAR_COUNT);
  const direction = payload.direction === 'forward' ? 'forward' : 'backward';

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Bar data window count must be a positive integer.');
  }
  if (count > maxBarsPerWindow) {
    throw new Error(`Bar data window count ${count} exceeds limit ${maxBarsPerWindow}.`);
  }

  const anchorMs = parseBarTimeMs(payload.anchor, 'anchor');
  const stepMs = timeframe * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
  const startMs = direction === 'forward' ? anchorMs : anchorMs - ((count - 1) * stepMs);
  const endMs = direction === 'forward' ? anchorMs + ((count - 1) * stepMs) : anchorMs;

  return {
    anchor: new Date(anchorMs).toISOString(),
    bounded: true,
    direction,
    end: formatApiTime(endMs),
    estimatedBars: count,
    instrument,
    start: formatApiTime(startMs),
    timeframe,
  };
}

export function normalizeBarWindow(payload = {}, options = {}) {
  if (payload.anchor && (!payload.start || !payload.end)) {
    return planBarWindow(payload, options);
  }

  const maxBarsPerWindow = Number(options.maxBarsPerWindow || DEFAULT_MAX_BARS_PER_WINDOW);
  const instrument = normalizeInstrument(payload.instrument);
  const timeframe = normalizeTimeframe(payload.timeframe);
  const startMs = parseBarTimeMs(payload.start, 'start');
  const endMs = parseBarTimeMs(payload.end, 'end');

  if (endMs < startMs) {
    throw new Error('Bar data window end must be after start.');
  }

  const estimatedBars = estimateWindowBars(startMs, endMs, timeframe);
  if (estimatedBars > maxBarsPerWindow) {
    throw new Error(`Bar data window estimates ${estimatedBars} bars, limit ${maxBarsPerWindow}.`);
  }

  const window = {
    bounded: true,
    end: formatApiTime(endMs),
    estimatedBars,
    instrument,
    start: formatApiTime(startMs),
    timeframe,
  };
  for (const key of ['canvasLeftBoundary', 'direction', 'historyRequest', 'requestCap']) {
    if (payload[key]) {
      window[key] = payload[key];
    }
  }
  return window;
}

export function windowBoundsMs(window) {
  return {
    endMs: parseBarTimeMs(window.end, 'end'),
    startMs: parseBarTimeMs(window.start, 'start'),
  };
}

export function planCanvasLeftOlderWindow(payload = {}, options = {}) {
  const maxBarsPerWindow = Number(options.maxBarsPerWindow || DEFAULT_MAX_BARS_PER_WINDOW);
  const instrument = normalizeInstrument(payload.instrument);
  const timeframe = normalizeTimeframe(payload.timeframe);
  const oldestLoadedMs = parseBarTimeMs(payload.oldestLoadedTimestamp, 'oldestLoadedTimestamp');
  const canvasLeftMs = parseBarTimeMs(payload.canvasLeftTimestamp, 'canvasLeftTimestamp');
  const stepMs = timeframe * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
  const endMs = oldestLoadedMs - stepMs;

  if (canvasLeftMs >= oldestLoadedMs) {
    return {
      bounded: true,
      exhausted: true,
      instrument,
      reason: 'canvas-left-inside-loaded-window',
      timeframe,
    };
  }

  const uncappedEstimatedBars = estimateWindowBars(canvasLeftMs, endMs, timeframe);
  const estimatedBars = Math.min(uncappedEstimatedBars, maxBarsPerWindow);
  const startMs = uncappedEstimatedBars > maxBarsPerWindow
    ? endMs - ((maxBarsPerWindow - 1) * stepMs)
    : canvasLeftMs;

  return {
    bounded: true,
    canvasLeftBoundary: formatApiTime(canvasLeftMs),
    chunked: uncappedEstimatedBars > maxBarsPerWindow,
    direction: 'backward',
    end: formatApiTime(endMs),
    estimatedBars,
    historyRequest: 'older-window',
    instrument,
    requestCap: 'canvas-left',
    start: formatApiTime(startMs),
    timeframe,
  };
}

export function windowCovers(record, planned) {
  if (!record || !planned) return false;
  if (record.instrument !== planned.instrument) return false;
  if (Number(record.timeframe) !== Number(planned.timeframe)) return false;

  const recordBounds = windowBoundsMs(record);
  const plannedBounds = windowBoundsMs(planned);
  return recordBounds.startMs <= plannedBounds.startMs && recordBounds.endMs >= plannedBounds.endMs;
}
