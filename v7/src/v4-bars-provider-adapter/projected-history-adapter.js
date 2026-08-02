import {
  createProjectedHistoryBatch,
  createProjectedHistoryRequest,
} from '../projected-history-contract/public.js';
import { resolveV4BarsApiBase, resolveV4InstrumentCode } from './v4-bars-provider-adapter.js';
import { formatExchangeWallMinute } from './time-codec.js';

export const V4_PROJECTED_HISTORY_PROVIDER_ID = 'provider.local-v4-projected-history';
const PROJECTED_HISTORY_DEADLINE_MS = 3_000;
const CALENDAR_TIMEFRAME_CODES = Object.freeze({
  'alignment.calendar-day': '1D',
  'alignment.calendar-month': '1M',
  'alignment.calendar-week': '1W',
});

function targetTimeframe(request) {
  if (request.alignmentKind === 'fixed-duration') return String(request.durationMs / 60_000);
  return CALENDAR_TIMEFRAME_CODES[request.alignmentPolicyId] ?? null;
}

function requestUrl(request, apiBase) {
  const timeframe = targetTimeframe(request);
  if (timeframe === null) throw new TypeError('V4 Projected History does not map this calendar alignment.');
  const parameters = new URLSearchParams({
    end: formatExchangeWallMinute(request.windowEndEpochMs),
    instrument: resolveV4InstrumentCode(request.instrumentId),
    session: request.sessionHoursMode,
    start: formatExchangeWallMinute(request.windowStartEpochMs),
    tf: timeframe,
  });
  return `${apiBase}/v4/projected_history?${parameters}`;
}

function failure(message) {
  return { kind: 'unavailable', message, retryAfterMs: null };
}

export function createV4ProjectedHistoryProvider({
  apiBase = resolveV4BarsApiBase(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('Projected History provider requires fetch.');
  return Object.freeze({
    providerId: V4_PROJECTED_HISTORY_PROVIDER_ID,
    async requestProjectedHistory(requestValue, { signal } = {}) {
      const request = createProjectedHistoryRequest(requestValue);
      if (request.providerId !== V4_PROJECTED_HISTORY_PROVIDER_ID
        || resolveV4InstrumentCode(request.instrumentId) === null
        || targetTimeframe(request) === null) {
        throw failure('Projected History provider does not support this request identity.');
      }
      let response;
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      const deadline = setTimeout(abort, PROJECTED_HISTORY_DEADLINE_MS);
      try {
        response = await fetchImpl(requestUrl(request, apiBase), {
          headers: { Accept: 'application/json' }, signal: controller.signal,
        });
      } catch (error) {
        throw failure(error?.message || 'Projected History service is unavailable.');
      } finally {
        clearTimeout(deadline);
        signal?.removeEventListener('abort', abort);
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || !Array.isArray(payload.bars)) {
        throw failure(payload?.error || `Projected History HTTP ${response.status}`);
      }
      if (payload.datasetRevision !== request.datasetRevision
        || payload.sessionHoursMode !== request.sessionHoursMode
        || payload.targetTimeframe !== targetTimeframe(request)) {
        throw failure('Projected History response provenance differs from its request.');
      }
      return createProjectedHistoryBatch({
        bars: payload.bars.map((bar) => ({
          close: bar.close,
          displayEpochMs: bar.displayTimestamp * 1_000,
          high: bar.high,
          labelDate: bar.labelDate ?? null,
          low: bar.low,
          open: bar.open,
          startEpochMs: bar.timestamp * 1_000,
          volume: bar.volume ?? null,
        })).filter((bar) => bar.startEpochMs >= request.windowStartEpochMs
          && bar.startEpochMs < request.windowEndEpochMs),
        request,
        schemaVersion: 1,
      });
    },
  });
}
