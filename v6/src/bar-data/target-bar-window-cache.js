import {
  makeTargetBarWindowKey,
  normalizeTargetBarWindow,
  targetWindowCovers,
  targetWindowBoundsMs,
} from './target-bar-window.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function cloneRecord(record, extras = {}) {
  return {
    ...record,
    ...extras,
    bars: cloneBars(extras.bars || record.bars),
    requestedRange: (extras.requestedRange || record.requestedRange)
      ? { ...(extras.requestedRange || record.requestedRange) }
      : null,
    timing: (extras.timing || record.timing) ? { ...(extras.timing || record.timing) } : null,
  };
}

function sliceBarsForWindow(bars, planned) {
  const { startMs, endMs } = targetWindowBoundsMs(planned);
  return cloneBars(bars)
    .filter((bar) => {
      const timestamp = Number(bar.timestamp);
      return Number.isFinite(timestamp)
        && timestamp >= Math.floor(startMs / 1000)
        && timestamp <= Math.floor(endMs / 1000);
    })
    .sort((left, right) => left.timestamp - right.timestamp);
}

export function createTargetBarWindowCache({ maxBarsPerWindow = 1000 } = {}) {
  const windows = new Map();
  let accessSequence = 0;

  function touch(record) {
    record.lastAccessedSequence = ++accessSequence;
    return record;
  }

  function findCoveringRecord(planned) {
    return [...windows.values()].find((record) => targetWindowCovers(record, planned)) || null;
  }

  function get(payload = {}) {
    const planned = normalizeTargetBarWindow(payload, { maxBarsPerWindow });
    const key = makeTargetBarWindowKey(planned);
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
      requestedRange: covered.requestedRange ? { ...covered.requestedRange } : null,
      timing: covered.timing ? { ...covered.timing } : null,
    };
  }

  function put(window, {
    bars = [],
    requestedRange = null,
    timing = null,
  } = {}) {
    const planned = normalizeTargetBarWindow(window, { maxBarsPerWindow });
    const key = makeTargetBarWindowKey(planned);
    const record = touch({
      ...planned,
      bars: cloneBars(bars),
      cacheHit: false,
      coveredByKey: null,
      key,
      requestedRange: requestedRange ? { ...requestedRange } : null,
      timing: timing ? { ...timing } : null,
    });
    windows.set(key, record);
    return cloneRecord(record);
  }

  function release(payload = {}) {
    const planned = normalizeTargetBarWindow(payload, { maxBarsPerWindow });
    const key = makeTargetBarWindowKey(planned);
    return {
      key,
      released: windows.delete(key),
    };
  }

  function summary() {
    const records = [...windows.values()];
    return {
      barCount: records.reduce((total, record) => total + record.bars.length, 0),
      dataKind: 'target-display',
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
