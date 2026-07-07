const JOURNAL_OWNER = 'journal-runtime';

const JOURNAL_ALLOWED_FIELDS = Object.freeze([
  'closedAt',
  'createdAt',
  'entryPrice',
  'exitPrice',
  'id',
  'metadata',
  'notes',
  'openedAt',
  'quantity',
  'side',
  'symbol',
  'tags',
  'updatedAt',
]);

const JOURNAL_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'orders',
  'replay',
  'session-dashboard',
  'viewport',
]);

export function getJournalOwner() {
  return JOURNAL_OWNER;
}

export function getJournalAllowedFields() {
  return [...JOURNAL_ALLOWED_FIELDS];
}

export function getJournalBlockedIntegrations() {
  return [...JOURNAL_BLOCKED_INTEGRATIONS];
}

export function createJournalContract() {
  return Object.freeze({
    allowedFields: getJournalAllowedFields(),
    blockedIntegrations: getJournalBlockedIntegrations(),
    canAdvanceReplay: false,
    canLoadBars: false,
    canOpenChart: false,
    canQueryCalendar: false,
    canReadOrders: false,
    canTouchViewport: false,
    commandSurfaceReady: true,
    owner: JOURNAL_OWNER,
    persistenceReady: true,
    rowActionVisible: false,
    surfaceReady: true,
  });
}
