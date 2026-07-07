const CALENDAR_OWNER = 'calendar-runtime';

const CALENDAR_ALLOWED_FIELDS = Object.freeze([
  'actual',
  'country',
  'createdAt',
  'currency',
  'eventId',
  'forecast',
  'impact',
  'metadata',
  'previous',
  'provider',
  'releaseTime',
  'sessionId',
  'source',
  'title',
  'updatedAt',
]);

const CALENDAR_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'journal',
  'orders',
  'replay',
  'session-dashboard',
  'viewport',
]);

export function getCalendarOwner() {
  return CALENDAR_OWNER;
}

export function getCalendarAllowedFields() {
  return [...CALENDAR_ALLOWED_FIELDS];
}

export function getCalendarBlockedIntegrations() {
  return [...CALENDAR_BLOCKED_INTEGRATIONS];
}

export function createCalendarContract() {
  return Object.freeze({
    allowedFields: getCalendarAllowedFields(),
    blockedIntegrations: getCalendarBlockedIntegrations(),
    canAdvanceReplay: false,
    canLoadBars: false,
    canMutateJournal: false,
    canOpenChart: false,
    canReadOrders: false,
    canTouchViewport: false,
    commandSurfaceReady: false,
    owner: CALENDAR_OWNER,
    persistenceReady: false,
    providerReadReady: false,
    rowActionVisible: false,
    writeReady: false,
  });
}
