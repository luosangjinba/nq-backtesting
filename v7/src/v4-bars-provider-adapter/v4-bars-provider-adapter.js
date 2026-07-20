import { createRawBarBatch, createRawBarRequest } from '../bar-data-contract/public.js';
import { createCoverageReport } from '../coverage-planning-contract/public.js';
import { createPolicyBoundProvider } from '../provider-execution-runtime/public.js';
import { formatExchangeWallMinute, exchangeWallSecondsToInstantMs } from './time-codec.js';

const MINUTE = 60_000;
export const V4_BARS_DATASET_REVISION = 'v4-local-futures-1m-r1';
export const V4_BARS_PROVIDER_ID = 'provider.local-v4-bars';

export function resolveV4BarsApiBase(locationLike = globalThis.location) {
  const hostname = locationLike?.hostname || '127.0.0.1';
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') return '';
  return `${locationLike?.protocol === 'https:' ? 'https:' : 'http:'}//${hostname}:8766`;
}

function requestUrl(request, apiBase) {
  const inclusiveEndEpochMs = Math.max(
    request.windowStartEpochMs,
    request.windowEndEpochMs - MINUTE,
  );
  const parameters = new URLSearchParams({
    end: formatExchangeWallMinute(inclusiveEndEpochMs),
    instrument: request.instrumentId.endsWith('.es') ? 'ES' : 'NQ',
    start: formatExchangeWallMinute(request.windowStartEpochMs),
    tf: '1',
  });
  return `${apiBase}/v4/bars?${parameters}`;
}

function failure(kind, message, retryAfterMs = null) {
  return { kind, message, retryAfterMs };
}

function httpFailure(response, payload) {
  const message = payload?.error || `V4 bars API HTTP ${response.status}`;
  if (response.status === 429) return failure('rate-limited', message);
  if (response.status === 401 || response.status === 403) return failure('authorization', message);
  if (response.status >= 500) return failure('unavailable', message);
  return failure('invalid-request', message);
}

function normalizeBars(payload, request) {
  if (!payload || !Array.isArray(payload.bars)) {
    throw failure('invalid-response', 'V4 bars response must contain a bars array.');
  }
  return payload.bars.map((bar) => ({
    startEpochMs: exchangeWallSecondsToInstantMs(bar.timestamp),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume ?? null,
  })).filter(({ startEpochMs }) => (
    startEpochMs >= request.windowStartEpochMs && startEpochMs < request.windowEndEpochMs
  ));
}

export function createV4BarsAdapter({
  apiBase = resolveV4BarsApiBase(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('V4 bars adapter requires fetch.');
  return Object.freeze({
    providerId: V4_BARS_PROVIDER_ID,
    resolveDatasetRevision: () => V4_BARS_DATASET_REVISION,
    async requestRawBars(requestValue, { signal } = {}) {
      const request = createRawBarRequest(requestValue);
      if (request.providerId !== V4_BARS_PROVIDER_ID) {
        throw failure('unsupported', 'V4 bars adapter does not support this provider identity.');
      }
      let response;
      try {
        response = await fetchImpl(requestUrl(request, apiBase), {
          headers: { Accept: 'application/json' }, signal,
        });
      } catch (error) {
        throw failure('unavailable', error?.message || 'V4 bars API is unavailable.');
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw httpFailure(response, payload);
      const batch = createRawBarBatch({
        bars: normalizeBars(payload, request), request, schemaVersion: 1,
      });
      return Object.freeze({
        batch,
        coverage: createCoverageReport({
          request, schemaVersion: 1,
          segments: [{
            startEpochMs: request.windowStartEpochMs,
            endEpochMs: request.windowEndEpochMs,
            kind: 'data',
          }],
        }),
      });
    },
  });
}

export function createV4BarsProvider(options = {}) {
  return createPolicyBoundProvider({
    adapter: createV4BarsAdapter(options),
    policy: {
      schemaVersion: 1,
      providerId: V4_BARS_PROVIDER_ID,
      revision: { mode: 'immutable', maxAgeMs: null },
      requestLimits: {
        maxBarsPerRequest: 65_000,
        maxWindowDurationMs: 45 * 24 * 60 * MINUTE,
        maxConcurrentRequests: 2,
      },
      deadlineMs: 3_000,
      retry: {
        maxAttempts: 2,
        backoffMs: [100],
        retryableFailureKinds: ['timeout', 'rate-limited', 'unavailable'],
      },
    },
  });
}

