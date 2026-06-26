const DEFAULT_MAX_ENTRIES = 12;

let maxEntries = DEFAULT_MAX_ENTRIES;
const cache = new Map();
const inflight = new Map();

function normalizePart(value) {
  return String(value ?? '').trim();
}

export function getBarsWindowCacheKey({ instrument, timeframe, start, end } = {}) {
  return [
    normalizePart(instrument).toUpperCase(),
    normalizePart(timeframe),
    normalizePart(start),
    normalizePart(end),
  ].join('|');
}

function clonePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  return {
    ...payload,
    bars: Array.isArray(payload.bars) ? payload.bars.map((bar) => ({ ...bar })) : payload.bars,
    requestedRange: payload.requestedRange ? { ...payload.requestedRange } : payload.requestedRange,
  };
}

function touch(key, payload) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, clonePayload(payload));
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

export async function fetchBarsWindowCached({ instrument, timeframe, start, end, load }) {
  const key = getBarsWindowCacheKey({ instrument, timeframe, start, end });
  if (cache.has(key)) {
    const payload = cache.get(key);
    touch(key, payload);
    return { payload: clonePayload(payload), cacheHit: true, cacheKey: key };
  }
  if (inflight.has(key)) {
    const payload = await inflight.get(key);
    return { payload: clonePayload(payload), cacheHit: true, cacheKey: key };
  }
  if (typeof load !== 'function') {
    throw new Error('bars window cache requires a load function');
  }
  const request = Promise.resolve()
    .then(load)
    .then((payload) => {
      touch(key, payload);
      return payload;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, request);
  const payload = await request;
  return { payload: clonePayload(payload), cacheHit: false, cacheKey: key };
}

export function configureBarsWindowCache({ maxEntries: nextMaxEntries } = {}) {
  const parsed = Number(nextMaxEntries);
  if (Number.isFinite(parsed) && parsed > 0) {
    maxEntries = Math.floor(parsed);
    while (cache.size > maxEntries) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
  }
}

export function getBarsWindowCacheStats() {
  return {
    entries: cache.size,
    inflight: inflight.size,
    maxEntries,
    keys: [...cache.keys()],
  };
}

export function clearBarsWindowCache() {
  cache.clear();
  inflight.clear();
  maxEntries = DEFAULT_MAX_ENTRIES;
}
