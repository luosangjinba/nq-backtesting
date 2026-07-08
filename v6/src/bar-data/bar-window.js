const DEFAULT_BAR_COUNT = 120;
const DEFAULT_MAX_BARS_PER_WINDOW = 500;
const MINUTE_MS = 60_000;

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

export function normalizeTimeframe(timeframe = 1) {
  const normalized = Number(timeframe);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error('Bar data timeframe must be a positive integer.');
  }
  return normalized;
}

export function parseBarTimeMs(value, fieldName = 'time') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10_000_000_000 ? value : value * 1000;
  }

  const text = String(value || '').trim();
  if (!text) {
    throw new Error(`Bar data ${fieldName} must be a valid date/time.`);
  }

  const normalized = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Bar data ${fieldName} must be a valid date/time.`);
  }
  return parsed;
}

export function formatApiTime(timestampMs) {
  return new Date(timestampMs).toISOString().slice(0, 16).replace('T', ' ');
}

export function estimateWindowBars(startMs, endMs, timeframe) {
  return Math.floor((endMs - startMs) / (normalizeTimeframe(timeframe) * MINUTE_MS)) + 1;
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
  const stepMs = timeframe * MINUTE_MS;
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
  const stepMs = timeframe * MINUTE_MS;
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

  const estimatedBars = estimateWindowBars(canvasLeftMs, endMs, timeframe);
  if (estimatedBars > maxBarsPerWindow) {
    throw new Error(`Canvas-left older window estimates ${estimatedBars} bars, limit ${maxBarsPerWindow}.`);
  }

  return {
    bounded: true,
    canvasLeftBoundary: formatApiTime(canvasLeftMs),
    direction: 'backward',
    end: formatApiTime(endMs),
    estimatedBars,
    historyRequest: 'older-window',
    instrument,
    requestCap: 'canvas-left',
    start: formatApiTime(canvasLeftMs),
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
