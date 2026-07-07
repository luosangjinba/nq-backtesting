const ANALYTICS_OWNER = 'session-analytics';

const ANALYTICS_ALLOWED_FIELDS = Object.freeze([
  'accountBalance',
  'autoUpdateEndDate',
  'createdAt',
  'durationDays',
  'endTime',
  'id',
  'name',
  'profileId',
  'startTime',
  'status',
  'symbol',
  'symbols',
  'timeframe',
  'workspaceId',
]);

const EMPTY_METRIC_PLACEHOLDERS = Object.freeze({
  averageRMultiple: null,
  expectancy: null,
  grossLoss: null,
  grossProfit: null,
  lossCount: null,
  maxDrawdown: null,
  netProfit: null,
  tradeCount: null,
  winCount: null,
  winRate: null,
});

function cloneSymbols(session = {}) {
  const symbols = Array.isArray(session.symbols) && session.symbols.length
    ? session.symbols
    : [session.symbol].filter(Boolean);
  return [...new Set(symbols.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean))];
}

function calculateDurationDays(startTime, endTime) {
  const start = new Date(startTime).valueOf();
  const end = new Date(endTime).valueOf();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return Math.ceil((end - start) / 86400000);
}

function readText(value, fallback = '') {
  const text = String(value || '').trim();
  if (text) return text;
  return fallback;
}

export function getSessionAnalyticsOwner() {
  return ANALYTICS_OWNER;
}

export function getSessionAnalyticsAllowedFields() {
  return [...ANALYTICS_ALLOWED_FIELDS];
}

export function createEmptySessionAnalyticsMetrics() {
  return Object.freeze({ ...EMPTY_METRIC_PLACEHOLDERS });
}

export function createSessionAnalyticsSnapshot(session = {}) {
  const symbols = cloneSymbols(session);
  const metadata = {
    accountBalance: Number.isFinite(Number(session.accountBalance)) ? Number(session.accountBalance) : 0,
    autoUpdateEndDate: Boolean(session.autoUpdateEndDate),
    createdAt: readText(session.createdAt, null),
    durationDays: calculateDurationDays(session.startTime, session.endTime),
    endTime: readText(session.endTime, null),
    id: readText(session.id, null),
    name: readText(session.name, 'Untitled session'),
    profileId: readText(session.profileId, null),
    startTime: readText(session.startTime, null),
    status: readText(session.status, 'unknown'),
    symbol: symbols[0] || readText(session.symbol, null),
    symbols,
    timeframe: readText(session.timeframe, null),
    workspaceId: readText(session.workspaceId, null),
  };

  return Object.freeze({
    metadata: Object.freeze(metadata),
    metrics: createEmptySessionAnalyticsMetrics(),
    owner: ANALYTICS_OWNER,
  });
}

export function createSessionAnalyticsContract() {
  return Object.freeze({
    allowedFields: getSessionAnalyticsAllowedFields(),
    canAdvanceReplay: false,
    canLoadBars: false,
    canMutateSession: false,
    canOpenChart: false,
    canReadCalendar: false,
    canReadJournal: false,
    canReadOrders: false,
    canTouchViewport: false,
    metricPlaceholders: Object.keys(EMPTY_METRIC_PLACEHOLDERS),
    owner: ANALYTICS_OWNER,
  });
}
