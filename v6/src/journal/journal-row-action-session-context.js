const JOURNAL_ROW_ACTION_CONTEXT_OWNER = 'journal-runtime';

const JOURNAL_ROW_ACTION_CONTEXT_ALLOWED_FIELDS = Object.freeze([
  'accountBalance',
  'createdAt',
  'endTime',
  'name',
  'profileId',
  'sessionId',
  'source',
  'startTime',
  'status',
  'symbol',
  'symbols',
  'timeframe',
  'workspaceId',
]);

const JOURNAL_ROW_ACTION_CONTEXT_BLOCKED_FIELDS = Object.freeze([
  'activeReplayState',
  'bars',
  'calendarEvents',
  'chartState',
  'journalEntries',
  'orders',
  'replayState',
  'viewportState',
]);

function normalizeText(value, fallback = null) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeSymbols(session = {}) {
  const source = Array.isArray(session.symbols) && session.symbols.length
    ? session.symbols
    : [session.symbol];
  return [...new Set(source
    .map((symbol) => String(symbol ?? '').trim().toUpperCase())
    .filter(Boolean))];
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getJournalRowActionContextOwner() {
  return JOURNAL_ROW_ACTION_CONTEXT_OWNER;
}

export function getJournalRowActionContextAllowedFields() {
  return [...JOURNAL_ROW_ACTION_CONTEXT_ALLOWED_FIELDS];
}

export function getJournalRowActionContextBlockedFields() {
  return [...JOURNAL_ROW_ACTION_CONTEXT_BLOCKED_FIELDS];
}

export function createJournalRowActionSessionContext(session = {}) {
  const symbols = normalizeSymbols(session);
  return Object.freeze({
    accountBalance: normalizeNumber(session.accountBalance),
    createdAt: normalizeText(session.createdAt),
    endTime: normalizeText(session.endTime),
    name: normalizeText(session.name, 'Untitled session'),
    profileId: normalizeText(session.profileId),
    sessionId: normalizeText(session.id || session.sessionId),
    source: 'recent-session-row',
    startTime: normalizeText(session.startTime),
    status: normalizeText(session.status, 'unknown'),
    symbol: symbols[0] || normalizeText(session.symbol),
    symbols,
    timeframe: normalizeText(session.timeframe),
    workspaceId: normalizeText(session.workspaceId),
  });
}

export function createJournalRowActionSessionContextContract() {
  return Object.freeze({
    allowedFields: getJournalRowActionContextAllowedFields(),
    blockedFields: getJournalRowActionContextBlockedFields(),
    canAdvanceReplay: false,
    canLoadBars: false,
    canOpenChart: false,
    canQueryCalendar: false,
    canReadOrders: false,
    canTouchViewport: false,
    owner: JOURNAL_ROW_ACTION_CONTEXT_OWNER,
    rowActionVisible: false,
    source: 'recent-session-row',
  });
}
