import {
  resolveMarketDataApiBase,
  resolveMarketDataInstrumentCode,
} from './market-data-provider-adapter.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WALL_MINUTE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function requestUrl(instrumentIds, apiBase) {
  const parameters = new URLSearchParams();
  instrumentIds.forEach((instrumentId) => parameters.append(
    'instrument', resolveMarketDataInstrumentCode(instrumentId),
  ));
  return `${apiBase}/v7/market-data/available-dates?${parameters}`;
}

function normalizeInstrumentIds(instrumentIds) {
  if (!Array.isArray(instrumentIds) || instrumentIds.length === 0) {
    throw new TypeError('Market date availability requires instruments.');
  }
  const normalized = [...new Set(instrumentIds)];
  if (normalized.length !== instrumentIds.length
    || normalized.some((instrumentId) => resolveMarketDataInstrumentCode(instrumentId) === null)) {
    throw new TypeError('Market date availability contains an unsupported instrument.');
  }
  return normalized;
}

function normalizePayload(payload, instrumentIds) {
  if (payload?.schemaVersion !== 1 || payload.timeZone !== 'America/New_York'
    || !Array.isArray(payload.instruments)) {
    throw new TypeError('Market date availability response is invalid.');
  }
  const byCode = new Map();
  payload.instruments.forEach((record) => {
    if (typeof record?.instrument !== 'string' || !Array.isArray(record.dates)
      || (record.dates.length > 0 && (!WALL_MINUTE_PATTERN.test(record.firstTimestamp)
        || !WALL_MINUTE_PATTERN.test(record.latestTimestamp)))
      || record.dates.some((date) => typeof date !== 'string' || !DATE_PATTERN.test(date))) {
      throw new TypeError('Market date availability response is invalid.');
    }
    const dates = [...new Set(record.dates)];
    if (dates.length !== record.dates.length) {
      throw new TypeError('Market date availability response contains duplicate dates.');
    }
    byCode.set(record.instrument, Object.freeze({
      dates: Object.freeze(dates),
      firstTimestamp: record.firstTimestamp,
      latestTimestamp: record.latestTimestamp,
    }));
  });
  return Object.freeze(Object.fromEntries(instrumentIds.map((instrumentId) => {
    const code = resolveMarketDataInstrumentCode(instrumentId);
    if (!byCode.has(code)) throw new TypeError('Market date availability response is incomplete.');
    return [instrumentId, byCode.get(code)];
  })));
}

/**
 * Owner: market-data provider adapter.
 * Purpose: expose New York calendar dates containing at least one source bar.
 * Inputs: capability instrument identities and optional cancellation signal.
 * Outputs: immutable date arrays keyed by capability instrument identity.
 * Side effects: performs one bounded read-only HTTP request per refresh.
 */
export function createMarketDateAvailability({
  apiBase = resolveMarketDataApiBase(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('Market date availability requires fetch.');
  return Object.freeze({
    async loadAvailableDates(instrumentIdsValue, { signal } = {}) {
      const instrumentIds = normalizeInstrumentIds(instrumentIdsValue);
      let response;
      try {
        response = await fetchImpl(requestUrl(instrumentIds, apiBase), {
          headers: { Accept: 'application/json' }, signal,
        });
      } catch (error) {
        throw new Error(error?.message || 'Market date availability is unavailable.');
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Market date availability HTTP ${response.status}`);
      }
      return normalizePayload(payload, instrumentIds);
    },
  });
}
