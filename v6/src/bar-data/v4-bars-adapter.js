export function resolveV4BarsApiBase(locationLike = globalThis.location) {
  const hostname = locationLike?.hostname || '127.0.0.1';
  const isLocal = hostname === '127.0.0.1' || hostname === 'localhost';
  if (!isLocal) return '';
  const protocol = locationLike?.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${hostname}:8766`;
}

export function buildV4BarsUrl(window, { apiBase = resolveV4BarsApiBase() } = {}) {
  const params = new URLSearchParams({
    end: window.end,
    instrument: window.instrument,
    start: window.start,
    tf: String(window.timeframe),
  });
  return `${apiBase}/v4/bars?${params}`;
}

export async function fetchV4Bars(window, {
  apiBase = resolveV4BarsApiBase(),
  fetchImpl = globalThis.fetch,
  now = () => performance.now(),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('V4 bars adapter requires fetch.');
  }

  const url = buildV4BarsUrl(window, { apiBase });
  const startedAtMs = now();
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  const responseAtMs = now();

  const payload = await response.json().catch(() => null);
  const finishedAtMs = now();

  if (!response.ok) {
    throw new Error(payload?.error || `V4 bars API HTTP ${response.status}`);
  }

  if (!payload || !Array.isArray(payload.bars)) {
    throw new Error('V4 bars API response must include bars array.');
  }

  return {
    bars: payload.bars,
    requestedRange: payload.requestedRange || null,
    timing: {
      durationMs: finishedAtMs - startedAtMs,
      parseMs: finishedAtMs - responseAtMs,
      requestMs: responseAtMs - startedAtMs,
      source: 'v4-bars-api',
    },
    url,
  };
}
