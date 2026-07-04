import { registerCommand } from './commands.js';
import { BAR_DATA_COMMANDS, BAR_DATA_EVENTS } from '../contracts/bar-data-contracts.js';
import { parseCanonicalTimeMs } from '../domain/canonical-time.js';

export { BAR_DATA_COMMANDS, BAR_DATA_EVENTS };

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
  const timestamp = parseCanonicalTimeMs(value);
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
  const parsedTime = typeof timestamp === 'number' ? timestamp * 1000 : parseCanonicalTimeMs(timestamp);
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

function normalizeScope(payload = {}) {
  const sessionId = String(payload.sessionId || '').trim();
  const paneId = String(payload.paneId || '').trim();
  if (!sessionId && !paneId) return null;
  return {
    sessionId,
    paneId,
    key: `${sessionId || '*'}|${paneId || '*'}`,
  };
}

function estimateBarCount(startMs, endMs, timeframe) {
  return Math.floor((endMs - startMs) / (timeframe * TIMEFRAME_TO_MS)) + 1;
}

function windowBoundsMs(window) {
  return {
    startMs: parseTime(window.start, 'start'),
    endMs: parseTime(window.end, 'end'),
  };
}

function coversWindow(record, planned) {
  if (!record || !planned) return false;
  if (record.instrument !== planned.instrument || Number(record.timeframe) !== Number(planned.timeframe)) {
    return false;
  }
  const recordBounds = windowBoundsMs(record);
  const plannedBounds = windowBoundsMs(planned);
  return recordBounds.startMs <= plannedBounds.startMs && recordBounds.endMs >= plannedBounds.endMs;
}

function sliceBarsForWindow(bars = [], planned) {
  const { startMs, endMs } = windowBoundsMs(planned);
  const startTimestamp = Math.floor(startMs / 1000);
  const endTimestamp = Math.floor(endMs / 1000);
  return bars
    .filter((bar) => Number(bar?.timestamp) >= startTimestamp && Number(bar?.timestamp) <= endTimestamp)
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
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
  let accessSequence = 0;

  function touch(record) {
    record.lastAccessedSequence = ++accessSequence;
    return record;
  }

  function scopeList(record) {
    return [...(record.scopes || new Map()).values()]
      .map((scope) => ({
        sessionId: scope.sessionId,
        paneId: scope.paneId,
      }))
      .sort((left, right) => `${left.sessionId}|${left.paneId}`.localeCompare(`${right.sessionId}|${right.paneId}`));
  }

  function attachScope(record, payload = {}) {
    const scope = normalizeScope(payload);
    if (!scope) return record;
    if (!(record.scopes instanceof Map)) {
      record.scopes = new Map();
    }
    record.scopes.set(scope.key, scope);
    record.releaseDeferred = false;
    record.releaseRequestedSequence = null;
    return record;
  }

  function cloneRecord(record, extras = {}) {
    const cloned = {
      ...record,
      ...extras,
      cacheScopes: scopeList(record),
      bars: [...(extras.bars || record.bars)],
    };
    delete cloned.scopes;
    return cloned;
  }

  function cloneCoveredRecord(record, planned) {
    return {
      ...planned,
      key: makeWindowKey(planned),
      bars: sliceBarsForWindow(record.bars, planned),
      requestedRange: record.requestedRange || null,
      cached: true,
      coveredByKey: record.key,
      cacheScopes: scopeList(record),
      releaseDeferred: false,
      releaseRequestedSequence: null,
      lastAccessedSequence: record.lastAccessedSequence || 0,
    };
  }

  function findCoveringRecord(planned) {
    return [...windows.values()].find((record) => coversWindow(record, planned)) || null;
  }

  function getWindow(payload = {}) {
    const planned = normalizeBarWindow(payload, { maxBarsPerWindow });
    const cached = windows.get(makeWindowKey(planned));
    if (cached) return cloneRecord(touch(attachScope(cached, payload)));
    const covered = findCoveringRecord(planned);
    return covered ? cloneCoveredRecord(touch(attachScope(covered, payload)), planned) : null;
  }

  async function loadWindow(payload = {}) {
    const planned = normalizeBarWindow(payload, { maxBarsPerWindow });
    const key = makeWindowKey(planned);
    const cached = windows.get(key);
    if (cached) {
      return cloneRecord(touch(attachScope(cached, payload)), { cached: true });
    }
    const covered = findCoveringRecord(planned);
    if (covered) {
      return cloneCoveredRecord(touch(attachScope(covered, payload)), planned);
    }

    const response = await fetchBars(planned);
    const bars = dedupeBars(normalizeBars(response?.bars || []));
    const record = {
      ...planned,
      key,
      bars,
      requestedRange: response?.requestedRange || null,
      cached: false,
      releaseDeferred: false,
      releaseRequestedSequence: null,
      lastAccessedSequence: 0,
      scopes: new Map(),
    };
    attachScope(record, payload);
    windows.set(key, touch(record));
    emit(BAR_DATA_EVENTS.WINDOW_LOADED, cloneRecord(record));
    return cloneRecord(record);
  }

  function releaseWindow(payload = {}) {
    const planned = normalizeBarWindow(payload, { maxBarsPerWindow });
    const key = makeWindowKey(planned);
    const cached = windows.get(key);
    if (payload.defer && cached) {
      cached.releaseDeferred = true;
      cached.releaseRequestedSequence = ++accessSequence;
      emit(BAR_DATA_EVENTS.WINDOW_RELEASE_DEFERRED, { key, window: planned });
      return { key, released: false, deferred: true };
    }
    const released = windows.delete(key);
    if (released) {
      emit(BAR_DATA_EVENTS.WINDOW_RELEASED, {
        key,
        window: cached ? cloneRecord(cached, { bars: [] }) : planned,
      });
    }
    return { key, released };
  }

  function releaseScope(payload = {}) {
    const targetScope = normalizeScope(payload);
    if (!targetScope) {
      throw new Error('bar data release scope requires sessionId or paneId.');
    }
    const defer = payload.defer !== false;
    const released = [];
    const deferred = [];
    const retained = [];

    for (const [key, record] of windows.entries()) {
      if (!(record.scopes instanceof Map)) continue;
      const matchedScopes = [...record.scopes.entries()]
        .filter(([, scope]) => {
          const sessionMatches = !targetScope.sessionId || scope.sessionId === targetScope.sessionId;
          const paneMatches = !targetScope.paneId || scope.paneId === targetScope.paneId;
          return sessionMatches && paneMatches;
        });
      if (!matchedScopes.length) continue;
      matchedScopes.forEach(([scopeKey]) => record.scopes.delete(scopeKey));
      if (record.scopes.size > 0) {
        retained.push({ key, cacheScopes: scopeList(record) });
        continue;
      }
      if (defer) {
        record.releaseDeferred = true;
        record.releaseRequestedSequence = ++accessSequence;
        deferred.push({ key, window: cloneRecord(record, { bars: [] }) });
        emit(BAR_DATA_EVENTS.WINDOW_RELEASE_DEFERRED, {
          key,
          window: cloneRecord(record, { bars: [] }),
          scope: targetScope,
        });
        continue;
      }
      windows.delete(key);
      released.push({ key, window: cloneRecord(record, { bars: [] }) });
      emit(BAR_DATA_EVENTS.WINDOW_RELEASED, {
        key,
        window: cloneRecord(record, { bars: [] }),
        scope: targetScope,
      });
    }

    return {
      scope: {
        sessionId: targetScope.sessionId,
        paneId: targetScope.paneId,
      },
      released,
      deferred,
      retained,
      retainedWindowCount: windows.size,
    };
  }

  function pruneCache({ maxWindows = windows.size, includeDeferred = true } = {}) {
    const normalizedMaxWindows = Number(maxWindows);
    if (!Number.isInteger(normalizedMaxWindows) || normalizedMaxWindows < 0) {
      throw new Error('bar data cache maxWindows must be a non-negative integer.');
    }

    const released = [];
    const candidates = [...windows.entries()]
      .filter(([, record]) => includeDeferred || windows.size > normalizedMaxWindows || !record.releaseDeferred)
      .sort(([, left], [, right]) => {
        if (left.releaseDeferred !== right.releaseDeferred) {
          return left.releaseDeferred ? -1 : 1;
        }
        return (left.lastAccessedSequence || 0) - (right.lastAccessedSequence || 0);
      });

    for (const [key, record] of candidates) {
      if (windows.size <= normalizedMaxWindows && !(includeDeferred && record.releaseDeferred)) break;
      windows.delete(key);
      released.push({ key, window: { ...record, bars: undefined } });
      emit(BAR_DATA_EVENTS.WINDOW_RELEASED, {
        key,
        window: cloneRecord(record, { bars: [] }),
      });
    }

    return {
      released,
      retainedWindowCount: windows.size,
    };
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
        releaseDeferred: Boolean(window.releaseDeferred),
        lastAccessedSequence: window.lastAccessedSequence || 0,
        cacheScopes: scopeList(window),
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
      registerCommand(BAR_DATA_COMMANDS.RELEASE_SCOPE, (payload) => releaseScope(payload)),
      registerCommand(BAR_DATA_COMMANDS.PRUNE_CACHE, (payload) => pruneCache(payload)),
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
