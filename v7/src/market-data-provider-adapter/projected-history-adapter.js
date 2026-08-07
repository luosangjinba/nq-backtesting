import {
  createProjectedHistoryBatch,
  createProjectedHistoryRequest,
} from '../projected-history-contract/public.js';
import { resolveMarketDataApiBase, resolveMarketDataInstrumentCode } from './market-data-provider-adapter.js';
import { formatExchangeWallMinute } from './time-codec.js';

export const MARKET_DATA_PROJECTED_HISTORY_PROVIDER_ID = 'provider.local-market-data-projected-history';
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
  if (timeframe === null) throw new TypeError('Projected History does not map this calendar alignment.');
  const parameters = new URLSearchParams({
    datasetRevision: request.datasetRevision,
    end: formatExchangeWallMinute(request.windowEndEpochMs),
    instrument: resolveMarketDataInstrumentCode(request.instrumentId),
    session: request.sessionHoursMode,
    start: formatExchangeWallMinute(request.windowStartEpochMs),
    tf: timeframe,
  });
  return `${apiBase}/v7/market-data/projected-history?${parameters}`;
}

function failure(message) {
  return { kind: 'unavailable', message, retryAfterMs: null };
}

function responseFailure(response, payload) {
  if (response.status === 409) {
    return { kind: 'revision-mismatch', message: payload?.error || 'Dataset revision changed.', retryAfterMs: null };
  }
  return failure(payload?.error || `Projected History HTTP ${response.status}`);
}

export function createMarketDataProjectedHistoryProvider({
  apiBase = resolveMarketDataApiBase(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('Projected History provider requires fetch.');
  return Object.freeze({
    providerId: MARKET_DATA_PROJECTED_HISTORY_PROVIDER_ID,
    async requestProjectedHistory(requestValue, { signal } = {}) {
      const request = createProjectedHistoryRequest(requestValue);
      if (request.providerId !== MARKET_DATA_PROJECTED_HISTORY_PROVIDER_ID
        || resolveMarketDataInstrumentCode(request.instrumentId) === null
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
        throw responseFailure(response, payload);
      }
      if (payload.datasetRevision !== request.datasetRevision) {
        throw {
          kind: 'revision-mismatch',
          message: 'Projected History response dataset revision differs from its request.',
          retryAfterMs: null,
        };
      }
      if (payload.sessionHoursMode !== request.sessionHoursMode
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
