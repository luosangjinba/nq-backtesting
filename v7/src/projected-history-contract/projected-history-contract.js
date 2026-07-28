const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const REQUEST_FIELDS = Object.freeze([
  'aggregationPolicyRevision', 'calendarRevision', 'datasetRevision',
  'displayTimeframeId', 'durationMs', 'instrumentId', 'providerId',
  'schemaVersion', 'sessionHoursMode', 'windowEndEpochMs', 'windowStartEpochMs',
]);

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new TypeError(`${label} must be a non-empty exact string.`);
  }
  return value;
}

function requireId(value, label) {
  requireString(value, label);
  if (!ID_PATTERN.test(value)) throw new TypeError(`${label} must be a namespaced capability id.`);
  return value;
}

function createProjectedHistoryBar(value) {
  const fields = ['close', 'displayEpochMs', 'high', 'low', 'open', 'startEpochMs', 'volume'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== fields.sort().join(',')
    || !Number.isSafeInteger(value.startEpochMs) || value.startEpochMs < 0
    || !Number.isSafeInteger(value.displayEpochMs) || value.displayEpochMs < value.startEpochMs
    || ['open', 'high', 'low', 'close'].some((field) => !Number.isFinite(value[field]))
    || value.high < Math.max(value.open, value.low, value.close)
    || value.low > Math.min(value.open, value.high, value.close)
    || (value.volume !== null && (!Number.isFinite(value.volume) || value.volume < 0))) {
    throw new TypeError('Projected History bar is invalid.');
  }
  return Object.freeze({
    close: value.close,
    displayEpochMs: value.displayEpochMs,
    high: value.high,
    low: value.low,
    open: value.open,
    startEpochMs: value.startEpochMs,
    volume: value.volume,
  });
}

export function createProjectedHistoryRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...REQUEST_FIELDS].sort().join(',')) {
    throw new TypeError('Projected History request fields are invalid.');
  }
  if (value.schemaVersion !== 1 || !['eth', 'rth'].includes(value.sessionHoursMode)
    || !Number.isSafeInteger(value.durationMs) || value.durationMs < 60_000
    || !Number.isSafeInteger(value.windowStartEpochMs) || value.windowStartEpochMs < 0
    || !Number.isSafeInteger(value.windowEndEpochMs)
    || value.windowEndEpochMs <= value.windowStartEpochMs) {
    throw new TypeError('Projected History request values are invalid.');
  }
  return Object.freeze({
    aggregationPolicyRevision: requireString(value.aggregationPolicyRevision, 'Aggregation revision'),
    calendarRevision: requireString(value.calendarRevision, 'Calendar revision'),
    datasetRevision: requireString(value.datasetRevision, 'Dataset revision'),
    displayTimeframeId: requireId(value.displayTimeframeId, 'Display timeframe'),
    durationMs: value.durationMs,
    instrumentId: requireId(value.instrumentId, 'Instrument'),
    providerId: requireId(value.providerId, 'Provider'),
    schemaVersion: 1,
    sessionHoursMode: value.sessionHoursMode,
    windowEndEpochMs: value.windowEndEpochMs,
    windowStartEpochMs: value.windowStartEpochMs,
  });
}

export function projectedHistoryRequestKey(value) {
  const request = createProjectedHistoryRequest(value);
  return JSON.stringify([
    request.providerId, request.instrumentId, request.displayTimeframeId,
    request.durationMs, request.sessionHoursMode, request.windowStartEpochMs,
    request.windowEndEpochMs, request.datasetRevision, request.calendarRevision,
    request.aggregationPolicyRevision,
  ]);
}

export function createProjectedHistoryBatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some((field) => !['bars', 'request', 'requestKey', 'schemaVersion'].includes(field))
    || !Object.hasOwn(value, 'bars') || !Object.hasOwn(value, 'request')
    || value.schemaVersion !== 1 || !Array.isArray(value.bars)) {
    throw new TypeError('Projected History batch is invalid.');
  }
  const request = createProjectedHistoryRequest(value.request);
  let previousStartEpochMs = -1;
  let previousDisplayEpochMs = -1;
  const bars = value.bars.map((candidate) => {
    const bar = createProjectedHistoryBar(candidate);
    if (bar.startEpochMs < request.windowStartEpochMs
      || bar.startEpochMs >= request.windowEndEpochMs
      || bar.startEpochMs <= previousStartEpochMs
      || bar.displayEpochMs <= previousDisplayEpochMs) {
      throw new TypeError('Projected History bars must be ordered inside their request window.');
    }
    previousStartEpochMs = bar.startEpochMs;
    previousDisplayEpochMs = bar.displayEpochMs;
    return bar;
  });
  const requestKey = projectedHistoryRequestKey(request);
  if (value.requestKey !== undefined && value.requestKey !== requestKey) {
    throw new TypeError('Projected History request key does not match its request.');
  }
  return Object.freeze({
    bars: Object.freeze(bars), request, requestKey, schemaVersion: 1,
  });
}
