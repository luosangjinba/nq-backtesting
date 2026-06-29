import { registerCommand } from './commands.js';

export const BAR_DATA_COMMANDS = Object.freeze({
  PLAN_WINDOW: 'barData.planWindow',
  LOAD_WINDOW: 'barData.loadWindow',
  GET_WINDOW: 'barData.getWindow',
  RELEASE_WINDOW: 'barData.releaseWindow',
  GET_CACHE_SUMMARY: 'barData.getCacheSummary',
});

export const BAR_DATA_EVENTS = Object.freeze({
  WINDOW_LOADED: 'barData:windowLoaded',
  WINDOW_RELEASED: 'barData:windowReleased',
});

const DEFAULT_MAX_BARS_PER_WINDOW = 500;
const DEFAULT_WINDOW_BARS = 120;
const TIMEFRAME_TO_MS = 60_000;

function resolveApiBase(locationLike = globalThis.location) {
  const hostname = locationLike?.hostname || '127.0.0.1';
  const isLocalDev = hostname === '127.0.0.1' || hostname === 'localhost';
  if (!isLocalDev) return '';
  const protocol = locationLike?.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${hostname}:8766`;
}

function normalizeInstrument(instrument = 'NQ') {
  const normalized = String(instrument || 'NQ').trim().toUpperCase();
  if (!normalized) {
    throw new Error('bar data instrument is required.');
  }
  return normalized;
}

function normalizeTimeframe(timeframe = 1) {
  const normalized = Number(timeframe);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('bar data timeframe must be a positive number.');
  }
  return normalized;
}

function parseTime(value, name) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`bar data ${name} must be a valid date/time.`);
  }
  return timestamp;
}

function formatApiTime(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
}

function normalizeBar(bar) {
  if (!bar || typeof bar !== 'object') {
    throw new Error('bar data response bar must be an object.');
  }

  const timestamp = bar.timestamp ?? bar.time;
  const parsedTime = typeof timestamp === 'number' ? timestamp * 1000 : Date.parse(timestamp);
  if (!Number.isFinite(parsedTime)) {
    throw new Error('bar data response bar timestamp is required.');
  }

  const open = Number(bar.open);
  const high = Number(bar.high);
  const low = Number(bar.low);
  const close = Number(bar.close);
  if (![open, high, low, close].every(Number.isFinite)) {
    throw new Error('bar data response bar OHLC values must be finite numbers.');
  }

  return {
    time: new Date(parsedTime).toISOString(),
    timestamp: Math.floor(parsedTime / 1000),
    open,
    high,
    low,
    close,
    volume: Number.isFinite(Number(bar.volume)) ? Number(bar.volume) : undefined,
  };
}

function normalizeBars(bars) {
  if (!Array.isArray(bars)) {
    throw new Error('bar data response must include a bars array.');
  }
  return bars
    .map(normalizeBar)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function dedupeBars(bars) {
  return [...new Map(bars.map((bar) => [bar.timestamp, bar])).values()]
    .sort((left, right) => left.timestamp - right.timestamp);
}

function makeWindowKey(window) {
  return [
    window.instrument,
    window.timeframe,
    window.start,
    window.end,
  ].join('|');
}

function estimateBarCount(startMs, endMs, timeframe) {
  return Math.floor((endMs - startMs) / (timeframe * TIMEFRAME_TO_MS)) + 1;
}

export function planBoundedBarWindow(payload = {}, options = {}) {
  const maxBarsPerWindow = Number(options.maxBarsPerWindow || DEFAULT_MAX_BARS_PER_WINDOW);
  const instrument = normalizeInstrument(payload.instrument);
  const timeframe = normalizeTimeframe(payload.timeframe);
  const direction = payload.direction === 'forward' ? 'forward' : 'backward';
  const count = Number(payload.count || DEFAULT_WINDOW_BARS);

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('bar data window count must be a positive integer.');
  }
  if (count > maxBarsPerWindow) {
    throw new Error(`bar data window count ${count} exceeds limit ${maxBarsPerWindow}.`);
  }

  const anchorMs = parseTime(payload.anchor, 'anchor');
  const stepMs = timeframe * TIMEFRAME_TO_MS;
  const startMs = direction === 'forward' ? anchorMs : anchorMs - ((count - 1) * stepMs);
  const endMs = direction === 'forward' ? anchorMs + ((count - 1) * stepMs) : anchorMs;

  return {
    instrument,
    timeframe,
    start: formatApiTime(startMs),
    end: formatApiTime(endMs),
    anchor: new Date(anchorMs).toISOString(),
    direction,
    estimatedBars: count,
    bounded: true,
  };
}

export function normalizeBarWindow(payload = {}, options = {}) {
  if (payload.anchor && (!payload.start || !payload.end)) {
    return planBoundedBarWindow(payload, options);
  }

  const maxBarsPerWindow = Number(options.maxBarsPerWindow || DEFAULT_MAX_BARS_PER_WINDOW);
  const instrument = normalizeInstrument(payload.instrument);
  const timeframe = normalizeTimeframe(payload.timeframe);
  const startMs = parseTime(payload.start, 'start');
  const endMs = parseTime(payload.end, 'end');

  if (endMs < startMs) {
    throw new Error('bar data window end must be after start.');
  }

  const estimatedBars = estimateBarCount(startMs, endMs, timeframe);
  if (estimatedBars > maxBarsPerWindow) {
    throw new Error(`bar data window estimates ${estimatedBars} bars, limit ${maxBarsPerWindow}.`);
  }

  return {
    instrument,
    timeframe,
    start: formatApiTime(startMs),
    end: formatApiTime(endMs),
    estimatedBars,
    bounded: true,
  };
}

async function fetchBarsFromV4(window, { apiBase = resolveApiBase(), fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('bar data runtime requires fetch.');
  }

  const params = new URLSearchParams({
    start: window.start,
    end: window.end,
    tf: String(window.timeframe),
    instrument: window.instrument,
  });
  const response = await fetchImpl(`${apiBase}/v4/bars?${params}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export function createBarDataRuntime({
  fetchBars = fetchBarsFromV4,
  maxBarsPerWindow = DEFAULT_MAX_BARS_PER_WINDOW,
} = {}) {
  const unregisterCallbacks = [];
  const windows = new Map();
  let emit = () => {};

  function getWindow(payload = {}) {
    const planned = normalizeBarWindow(payload, { maxBarsPerWindow });
    const cached = windows.get(makeWindowKey(planned));
    return cached ? { ...cached, bars: [...cached.bars] } : null;
  }

  async function loadWindow(payload = {}) {
    const planned = normalizeBarWindow(payload, { maxBarsPerWindow });
    const key = makeWindowKey(planned);
    const cached = windows.get(key);
    if (cached) {
      return { ...cached, bars: [...cached.bars], cached: true };
    }

    const response = await fetchBars(planned);
    const bars = dedupeBars(normalizeBars(response?.bars || []));
    const record = {
      ...planned,
      key,
      bars,
      requestedRange: response?.requestedRange || null,
      cached: false,
    };
    windows.set(key, record);
    emit(BAR_DATA_EVENTS.WINDOW_LOADED, { ...record, bars: [...record.bars] });
    return { ...record, bars: [...record.bars] };
  }

  function releaseWindow(payload = {}) {
    const planned = normalizeBarWindow(payload, { maxBarsPerWindow });
    const key = makeWindowKey(planned);
    const released = windows.delete(key);
    if (released) {
      emit(BAR_DATA_EVENTS.WINDOW_RELEASED, { key, window: planned });
    }
    return { key, released };
  }

  function getCacheSummary() {
    return {
      windowCount: windows.size,
      barCount: [...windows.values()].reduce((total, window) => total + window.bars.length, 0),
      windows: [...windows.values()].map((window) => ({
        key: window.key,
        instrument: window.instrument,
        timeframe: window.timeframe,
        start: window.start,
        end: window.end,
        barCount: window.bars.length,
      })),
    };
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(BAR_DATA_COMMANDS.PLAN_WINDOW, (payload) => normalizeBarWindow(payload, { maxBarsPerWindow })),
      registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, (payload) => loadWindow(payload)),
      registerCommand(BAR_DATA_COMMANDS.GET_WINDOW, (payload) => getWindow(payload)),
      registerCommand(BAR_DATA_COMMANDS.RELEASE_WINDOW, (payload) => releaseWindow(payload)),
      registerCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY, () => getCacheSummary())
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    windows.clear();
  }

  return {
    id: 'runtime.barData',
    start,
    stop,
  };
}
