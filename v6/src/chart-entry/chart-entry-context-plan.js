const DEFAULT_PREFIX_BARS = 120;

function normalizeText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Chart entry context ${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Chart entry context ${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeTimeframeMinutes(timeframe) {
  const match = String(timeframe || '').trim().match(/^(\d+)(m)?$/i);
  if (!match) {
    throw new Error('Chart entry context timeframe must be minute-based.');
  }
  return normalizePositiveInteger(match[1], 'timeframe');
}

function normalizeIsoTime(value, fieldName) {
  const normalized = normalizeText(value, fieldName);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`Chart entry context ${fieldName} must be a valid date/time.`);
  }
  return parsed.toISOString();
}

export function createChartEntryContextPlan(session, {
  prefixBars = DEFAULT_PREFIX_BARS,
} = {}) {
  if (!session?.id) {
    throw new Error('Chart entry context session is required.');
  }
  const startBarAnchor = normalizeIsoTime(session.startTime, 'startTime');
  const timeframe = normalizeTimeframeMinutes(session.timeframe);
  const prefixCount = normalizePositiveInteger(prefixBars, 'prefixBars');
  return Object.freeze({
    boundedContextWindow: Object.freeze({
      anchor: startBarAnchor,
      count: prefixCount + 1,
      direction: 'backward',
      instrument: normalizeText(session.symbol, 'symbol').toUpperCase(),
      timeframe,
    }),
    owner: 'runtime.chartEntryInitialization',
    sessionId: normalizeText(session.id, 'sessionId'),
    startBarAnchor,
    status: 'planned',
  });
}

export function getDefaultContextPrefixBars() {
  return DEFAULT_PREFIX_BARS;
}
