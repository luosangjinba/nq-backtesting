const SUMMARY_OWNER = 'session-summary';

const SUMMARY_ALLOWED_FIELDS = Object.freeze([
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

export function getSessionSummaryOwner() {
  return SUMMARY_OWNER;
}

export function getSessionSummaryAllowedFields() {
  return [...SUMMARY_ALLOWED_FIELDS];
}

export function createSessionSummary(session = {}) {
  const symbols = cloneSymbols(session);
  const summary = {
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

  return Object.freeze(summary);
}

export function createSessionSummaryContract() {
  return Object.freeze({
    allowedFields: getSessionSummaryAllowedFields(),
    canLoadBars: false,
    canOpenChart: false,
    canMutateSession: false,
    canReadOrders: false,
    canReadJournal: false,
    canReadCalendar: false,
    owner: SUMMARY_OWNER,
  });
}
