import { resolveV4BarsApiBase } from './v4-bars-adapter.js';
import { targetTimeframeToApiCacheKey } from '../time-domain/target-timeframe-domain.js';

export function buildV4TargetBarsUrl(window, { apiBase = resolveV4BarsApiBase() } = {}) {
  const params = new URLSearchParams({
    end: window.end,
    instrument: window.instrument,
    start: window.start,
    tf: targetTimeframeToApiCacheKey(window.timeframe),
  });
  return `${apiBase}/v4/target_bars?${params}`;
}

export async function fetchV4TargetBars(window, {
  apiBase = resolveV4BarsApiBase(),
  fetchImpl = globalThis.fetch,
  now = () => performance.now(),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('V4 target bars adapter requires fetch.');
  }

  const url = buildV4TargetBarsUrl(window, { apiBase });
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
    throw new Error(payload?.error || `V4 target bars API HTTP ${response.status}`);
  }

  if (!payload || !Array.isArray(payload.bars)) {
    throw new Error('V4 target bars API response must include bars array.');
  }

  return {
    bars: payload.bars,
    cacheHit: Boolean(payload.cacheHit),
    requestedRange: payload.requestedRange || null,
    targetTimeframe: payload.targetTimeframe || targetTimeframeToApiCacheKey(window.timeframe),
    timing: {
      durationMs: finishedAtMs - startedAtMs,
      parseMs: finishedAtMs - responseAtMs,
      requestMs: responseAtMs - startedAtMs,
      source: 'v4-target-bars-api',
    },
    url,
  };
}
