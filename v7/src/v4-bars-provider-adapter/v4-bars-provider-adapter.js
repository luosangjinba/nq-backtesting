import { createRawBar, createRawBarBatch, createRawBarRequest } from '../bar-data-contract/public.js';
import { createCoverageReport } from '../coverage-planning-contract/public.js';
import { createPolicyBoundProvider } from '../provider-execution-runtime/public.js';
import { formatExchangeWallMinute, exchangeWallSecondsToInstantMs } from './time-codec.js';

const MINUTE = 60_000;
const API_CHUNK_DURATION_MS = 7 * 24 * 60 * MINUTE;
const API_TRANSPORT_CONCURRENCY = 2;
const MAXIMUM_LOGICAL_REQUEST_MINUTES = 210 * 24 * 60;
export const V4_BARS_DATASET_REVISION = 'v4-local-futures-1m-r1';
export const V4_BARS_PROVIDER_ID = 'provider.local-v4-bars';
const V4_INSTRUMENT_CODES = Object.freeze({
  'instrument.cme.es': 'ES',
  'instrument.cme.nq': 'NQ',
});

export function resolveV4InstrumentCode(instrumentId) {
  return V4_INSTRUMENT_CODES[instrumentId] ?? null;
}

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
    instrument: resolveV4InstrumentCode(request.instrumentId),
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
  const bars = [];
  for (const bar of payload.bars) {
    const startEpochMs = exchangeWallSecondsToInstantMs(bar.timestamp);
    if (startEpochMs < request.windowStartEpochMs || startEpochMs >= request.windowEndEpochMs) continue;
    bars.push(createRawBar({
      startEpochMs,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume ?? null,
    }));
  }
  return bars;
}

function chunkRequests(request) {
  const chunks = [];
  for (let startEpochMs = request.windowStartEpochMs;
    startEpochMs < request.windowEndEpochMs;
    startEpochMs += API_CHUNK_DURATION_MS) {
    chunks.push(createRawBarRequest({
      ...request,
      windowStartEpochMs: startEpochMs,
      windowEndEpochMs: Math.min(request.windowEndEpochMs, startEpochMs + API_CHUNK_DURATION_MS),
    }));
  }
  return chunks;
}

function yieldMainThread() {
  if (typeof globalThis.scheduler?.yield === 'function') return globalThis.scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createTransportQueue(limit = API_TRANSPORT_CONCURRENCY) {
  const queued = [];
  let active = 0;
  function drain() {
    while (active < limit && queued.length > 0) {
      const entry = queued.shift();
      if (entry.signal?.aborted) {
        entry.reject(failure('unavailable', 'V4 bars request was aborted.'));
        continue;
      }
      active += 1;
      Promise.resolve().then(entry.task).then(entry.resolve, entry.reject).finally(() => {
        active -= 1;
        drain();
      });
    }
  }
  return (task, signal) => new Promise((resolve, reject) => {
    queued.push({ reject, resolve, signal, task });
    drain();
  });
}

export function createV4BarsAdapter({
  apiBase = resolveV4BarsApiBase(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('V4 bars adapter requires fetch.');
  const transport = createTransportQueue();
  return Object.freeze({
    providerId: V4_BARS_PROVIDER_ID,
    resolveDatasetRevision: () => V4_BARS_DATASET_REVISION,
    async requestRawBars(requestValue, { signal } = {}) {
      const request = createRawBarRequest(requestValue);
      if (request.providerId !== V4_BARS_PROVIDER_ID) {
        throw failure('unsupported', 'V4 bars adapter does not support this provider identity.');
      }
      if (resolveV4InstrumentCode(request.instrumentId) === null) {
        throw failure('unsupported', 'V4 bars adapter does not support this instrument identity.');
      }
      const chunks = chunkRequests(request);
      const chunkBars = await Promise.all(chunks.map((chunk) => transport(async () => {
        let response;
        try {
          response = await fetchImpl(requestUrl(chunk, apiBase), {
            headers: { Accept: 'application/json' }, signal,
          });
        } catch (error) {
          throw failure('unavailable', error?.message || 'V4 bars API is unavailable.');
        }
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw httpFailure(response, payload);
        return normalizeBars(payload, chunk);
      }, signal)));
      if (chunks.length > 1) await yieldMainThread();
      const bars = chunkBars.flat();
      const batch = createRawBarBatch({
        bars, request, schemaVersion: 1,
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
        maxBarsPerRequest: MAXIMUM_LOGICAL_REQUEST_MINUTES,
        maxWindowDurationMs: MAXIMUM_LOGICAL_REQUEST_MINUTES * MINUTE,
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
