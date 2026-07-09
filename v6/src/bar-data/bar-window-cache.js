import {
  formatApiTime,
  makeBarWindowKey,
  normalizeBarWindow,
  normalizeTimeframe,
  parseBarTimeMs,
  windowBoundsMs,
  windowCovers,
} from './bar-window.js';
import {
  TIME_DOMAIN_CONSTANTS,
  unixMillisecondsToSeconds,
} from '../time-domain/time-domain.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function cloneRecord(record, extras = {}) {
  return {
    ...record,
    ...extras,
    bars: cloneBars(extras.bars || record.bars),
    history: (extras.history || record.history) ? { ...(extras.history || record.history) } : null,
    timing: record.timing ? { ...record.timing } : null,
  };
}

function sliceBarsForWindow(bars, planned) {
  const { startMs, endMs } = windowBoundsMs(planned);
  const startTimestamp = unixMillisecondsToSeconds(startMs, {
    fieldName: 'Bar data cache window startMs',
  });
  const endTimestamp = unixMillisecondsToSeconds(endMs, {
    fieldName: 'Bar data cache window endMs',
  });
  return cloneBars(bars)
    .filter((bar) => bar.timestamp >= startTimestamp && bar.timestamp <= endTimestamp)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function barTimestampMs(bar = {}) {
  try {
    return parseBarTimeMs(bar.timestamp ?? bar.time, 'bar timestamp');
  } catch {
    return null;
  }
}

function boundaryTime(timestampMs) {
  return Number.isFinite(timestampMs) ? formatApiTime(timestampMs) : null;
}

function boundaryTimestamp(timestampMs, fieldName) {
  return Number.isFinite(timestampMs)
    ? unixMillisecondsToSeconds(timestampMs, { fieldName })
    : null;
}

function inferStepMs(record) {
  const timestamps = cloneBars(record.bars)
    .map(barTimestampMs)
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((left, right) => left - right);
  for (let index = 1; index < timestamps.length; index += 1) {
    const diff = timestamps[index] - timestamps[index - 1];
    if (diff > 0) return diff;
  }
  return normalizeTimeframe(record.timeframe || 1) * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
}

function scopeKey(record) {
  return `${record.instrument}|${record.timeframe}`;
}

function createEmptyBoundaryScope(record) {
  return {
    earliestLoadedMs: null,
    emptyWindowCount: 0,
    exhaustedBefore: false,
    instrument: record.instrument,
    knownExhaustedBeforeMs: null,
    latestLoadedMs: null,
    loadedBarCount: 0,
    loadedWindowCount: 0,
    timeframe: Number(record.timeframe),
    windowCount: 0,
  };
}

function applyBoundaryRecord(scope, record) {
  const bars = sliceBarsForWindow(record.bars, record);
  const timestamps = bars
    .map(barTimestampMs)
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((left, right) => left - right);
  const hasBars = timestamps.length > 0;
  scope.windowCount += 1;
  if (hasBars) {
    scope.loadedWindowCount += 1;
    scope.loadedBarCount += timestamps.length;
    scope.earliestLoadedMs = scope.earliestLoadedMs === null
      ? timestamps[0]
      : Math.min(scope.earliestLoadedMs, timestamps[0]);
    scope.latestLoadedMs = scope.latestLoadedMs === null
      ? timestamps.at(-1)
      : Math.max(scope.latestLoadedMs, timestamps.at(-1));
  } else {
    scope.emptyWindowCount += 1;
  }

  if (record.history?.exhaustedBefore === true) {
    const bounds = windowBoundsMs(record);
    const exhaustedMs = hasBars ? timestamps[0] - inferStepMs(record) : bounds.endMs;
    scope.exhaustedBefore = true;
    scope.knownExhaustedBeforeMs = scope.knownExhaustedBeforeMs === null
      ? exhaustedMs
      : Math.max(scope.knownExhaustedBeforeMs, exhaustedMs);
  }
}

function serializeBoundaryScope(scope) {
  return {
    earliestLoadedTime: boundaryTime(scope.earliestLoadedMs),
    earliestLoadedTimestamp: boundaryTimestamp(
      scope.earliestLoadedMs,
      'Bar data cache earliestLoadedMs',
    ),
    emptyWindowCount: scope.emptyWindowCount,
    exhaustedBefore: scope.exhaustedBefore,
    instrument: scope.instrument,
    knownExhaustedBeforeTime: boundaryTime(scope.knownExhaustedBeforeMs),
    knownExhaustedBeforeTimestamp: boundaryTimestamp(
      scope.knownExhaustedBeforeMs,
      'Bar data cache knownExhaustedBeforeMs',
    ),
    latestLoadedTime: boundaryTime(scope.latestLoadedMs),
    latestLoadedTimestamp: boundaryTimestamp(
      scope.latestLoadedMs,
      'Bar data cache latestLoadedMs',
    ),
    loadedBarCount: scope.loadedBarCount,
    loadedWindowCount: scope.loadedWindowCount,
    timeframe: scope.timeframe,
    windowCount: scope.windowCount,
  };
}

export function createBarWindowCache({ maxBarsPerWindow = 500 } = {}) {
  const windows = new Map();
  let accessSequence = 0;

  function touch(record) {
    record.lastAccessedSequence = ++accessSequence;
    return record;
  }

  function findCoveringRecord(planned) {
    return [...windows.values()].find((record) => windowCovers(record, planned)) || null;
  }

  function get(payload = {}) {
    const planned = normalizeBarWindow(payload, { maxBarsPerWindow });
    const key = makeBarWindowKey(planned);
    const exact = windows.get(key);
    if (exact) {
      return cloneRecord(touch(exact), {
        cacheHit: true,
        coveredByKey: null,
      });
    }

    const covered = findCoveringRecord(planned);
    if (!covered) return null;
    touch(covered);
    return {
      ...planned,
      bars: sliceBarsForWindow(covered.bars, planned),
      cacheHit: true,
      coveredByKey: covered.key,
      key,
      lastAccessedSequence: covered.lastAccessedSequence,
      history: covered.history ? { ...covered.history } : null,
      requestedRange: covered.requestedRange || null,
      timing: covered.timing ? { ...covered.timing } : null,
    };
  }

  function put(window, {
    bars = [],
    history = null,
    requestedRange = null,
    timing = null,
  } = {}) {
    const planned = normalizeBarWindow(window, { maxBarsPerWindow });
    const key = makeBarWindowKey(planned);
    const record = touch({
      ...planned,
      bars: cloneBars(bars),
      cacheHit: false,
      coveredByKey: null,
      history: history ? { ...history } : null,
      key,
      requestedRange,
      timing: timing ? { ...timing } : null,
    });
    windows.set(key, record);
    return cloneRecord(record);
  }

  function release(payload = {}) {
    const planned = normalizeBarWindow(payload, { maxBarsPerWindow });
    const key = makeBarWindowKey(planned);
    return {
      key,
      released: windows.delete(key),
    };
  }

  function summary() {
    const records = [...windows.values()];
    return {
      barCount: records.reduce((total, record) => total + record.bars.length, 0),
      keys: records.map((record) => record.key).sort(),
      windowCount: records.length,
    };
  }

  function boundaryMetadata(payload = {}) {
    const filters = {
      instrument: payload.instrument ? String(payload.instrument).trim().toUpperCase() : null,
      timeframe: payload.timeframe ? Number(payload.timeframe) : null,
    };
    const scopes = new Map();
    for (const record of windows.values()) {
      if (filters.instrument && record.instrument !== filters.instrument) continue;
      if (filters.timeframe && Number(record.timeframe) !== filters.timeframe) continue;
      const key = scopeKey(record);
      if (!scopes.has(key)) {
        scopes.set(key, createEmptyBoundaryScope(record));
      }
      applyBoundaryRecord(scopes.get(key), record);
    }
    const serialized = [...scopes.values()]
      .map(serializeBoundaryScope)
      .sort((left, right) => (
        left.instrument.localeCompare(right.instrument) || left.timeframe - right.timeframe
      ));
    return {
      scope: filters.instrument || filters.timeframe ? {
        instrument: filters.instrument,
        timeframe: filters.timeframe,
      } : null,
      scopes: serialized,
      windowCount: serialized.reduce((total, scope) => total + scope.windowCount, 0),
    };
  }

  function clear() {
    windows.clear();
    accessSequence = 0;
  }

  return {
    boundaryMetadata,
    clear,
    get,
    put,
    release,
    summary,
  };
}
