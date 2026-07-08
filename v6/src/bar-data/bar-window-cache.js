import {
  makeBarWindowKey,
  normalizeBarWindow,
  windowBoundsMs,
  windowCovers,
} from './bar-window.js';

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
  const startTimestamp = Math.floor(startMs / 1000);
  const endTimestamp = Math.floor(endMs / 1000);
  return cloneBars(bars)
    .filter((bar) => bar.timestamp >= startTimestamp && bar.timestamp <= endTimestamp)
    .sort((left, right) => left.timestamp - right.timestamp);
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

  function clear() {
    windows.clear();
    accessSequence = 0;
  }

  return {
    clear,
    get,
    put,
    release,
    summary,
  };
}
