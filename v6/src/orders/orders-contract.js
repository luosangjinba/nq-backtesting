const ORDERS_OWNER = 'orders-runtime';

const ORDERS_ALLOWED_FIELDS = Object.freeze([
  'accountId',
  'averagePrice',
  'closedAt',
  'commission',
  'createdAt',
  'direction',
  'entryPrice',
  'exitPrice',
  'fees',
  'id',
  'instrument',
  'metadata',
  'openedAt',
  'profitLoss',
  'quantity',
  'sessionId',
  'source',
  'status',
  'strategy',
  'tags',
  'timeframe',
  'type',
]);

const ORDERS_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'journal',
  'replay',
  'session-dashboard',
  'viewport',
]);

export function getOrdersOwner() {
  return ORDERS_OWNER;
}

export function getOrdersAllowedFields() {
  return [...ORDERS_ALLOWED_FIELDS];
}

export function getOrdersBlockedIntegrations() {
  return [...ORDERS_BLOCKED_INTEGRATIONS];
}

export function createOrdersContract() {
  return Object.freeze({
    allowedFields: getOrdersAllowedFields(),
    blockedIntegrations: getOrdersBlockedIntegrations(),
    canAdvanceReplay: false,
    canLoadBars: false,
    canMutateJournal: false,
    canOpenChart: false,
    canQueryCalendar: false,
    canReadSessionMetadata: false,
    canTouchViewport: false,
    commandSurfaceReady: false,
    owner: ORDERS_OWNER,
    persistenceReady: false,
    rowActionVisible: false,
    writeReady: false,
  });
}
