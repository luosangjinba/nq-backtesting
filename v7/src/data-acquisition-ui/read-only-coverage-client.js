const INSTRUMENTS = Object.freeze(['ES', 'NQ']);

function resolveMarketDataApiBase(locationLike = globalThis.location) {
  const hostname = locationLike?.hostname || '127.0.0.1';
  if (locationLike?.protocol === 'https:') return '';
  return `http://${hostname}:8766`;
}

async function readJson(response, label) {
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error(`${label} returned an unreadable HTTP ${response.status} response.`);
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const errorMessage = typeof payload.error === 'string'
      ? payload.error
      : payload.error?.message;
    const error = new Error(errorMessage || `${label} failed with HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function readCoveragePayload(payload) {
  if (payload?.schemaVersion !== 1 || !Array.isArray(payload.instruments)) {
    throw new Error('Market-data coverage returned an invalid response.');
  }
  const byInstrument = new Map(payload.instruments.map((item) => [item?.instrument, item]));
  return Object.freeze(INSTRUMENTS.map((instrument) => {
    const item = byInstrument.get(instrument);
    if (!item || !Array.isArray(item.dates)) {
      throw new Error(`Market-data coverage is missing ${instrument}.`);
    }
    return Object.freeze({
      firstTimestamp: item.firstTimestamp ?? null,
      instrument,
      latestTimestamp: item.latestTimestamp ?? null,
      marketDateCount: item.dates.length,
      source: 'market-data-read-only',
    });
  }));
}

/** Read active database coverage without acquiring any maintenance authority. */
export function createReadOnlyCoverageClient(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  if (typeof fetchImpl !== 'function') throw new TypeError('Read-only coverage requires fetch.');
  const apiBase = options.apiBase ?? resolveMarketDataApiBase(options.location);

  return Object.freeze({
    apiBase,
    async read({ signal } = {}) {
      const query = new URLSearchParams();
      for (const instrument of INSTRUMENTS) query.append('instrument', instrument);
      const [healthResponse, coverageResponse] = await Promise.all([
        fetchImpl(`${apiBase}/v7/market-data/health`, {
          cache: 'no-store', signal,
        }),
        fetchImpl(`${apiBase}/v7/market-data/available-dates?${query}`, {
          cache: 'no-store', signal,
        }),
      ]);
      const [health, coverage] = await Promise.all([
        readJson(healthResponse, 'Market-data health'),
        readJson(coverageResponse, 'Market-data coverage'),
      ]);
      if (health.databaseReady !== true) throw new Error('Market database is not active.');
      return Object.freeze({
        coverage: readCoveragePayload(coverage),
        datasetRevision: health.datasetRevision ?? null,
      });
    },
  });
}

export { resolveMarketDataApiBase };
