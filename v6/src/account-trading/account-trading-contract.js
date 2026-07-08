const ACCOUNT_TRADING_OWNER = 'account-trading-runtime';

const ACCOUNT_READOUT_ALLOWED_FIELDS = Object.freeze([
  'accountId',
  'balance',
  'availableBalance',
  'equity',
  'realizedPnl',
  'unrealizedPnl',
  'margin',
  'currency',
  'metadata',
]);

const TRADE_DRAFT_ALLOWED_FIELDS = Object.freeze([
  'side',
  'symbol',
  'quantity',
  'orderType',
  'price',
  'stopLoss',
  'takeProfit',
  'timeInForce',
  'sessionId',
  'metadata',
]);

const TRADE_DRAFT_ALLOWED_SIDES = Object.freeze([
  'buy',
  'sell',
]);

const TRADE_DRAFT_ALLOWED_ORDER_TYPES = Object.freeze([
  'market',
  'limit',
  'stop',
]);

const TRADE_DRAFT_ALLOWED_TIME_IN_FORCE = Object.freeze([
  'day',
  'gtc',
]);

const ACCOUNT_TRADING_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'default-wall',
  'display-timeframe',
  'drawing-action-history',
  'indicators',
  'orders',
  'replay',
  'screenshot-export',
  'session-dashboard',
  'session-settings',
  'settings',
  'viewport',
]);

const DEFAULT_ACCOUNT_READOUT = Object.freeze({
  accountId: null,
  availableBalance: null,
  balance: null,
  currency: 'USD',
  equity: null,
  margin: null,
  metadata: null,
  realizedPnl: null,
  unrealizedPnl: null,
});

const DEFAULT_TRADE_DRAFT = Object.freeze({
  metadata: null,
  orderType: 'market',
  price: null,
  quantity: 1,
  sessionId: null,
  side: 'buy',
  stopLoss: null,
  symbol: 'NQ',
  takeProfit: null,
  timeInForce: 'day',
});

const DEFAULT_ACCOUNT_TRADING_INTENT = Object.freeze({
  accountReadout: DEFAULT_ACCOUNT_READOUT,
  analyticsEnabled: false,
  controlsEnabled: false,
  readOnly: true,
  tradeDraft: DEFAULT_TRADE_DRAFT,
});

function normalizeOptionalText(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeOptionalNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalizeObject(value, fallback) {
  if (value === null || value === undefined) {
    return fallback === null ? null : Object.freeze({ ...fallback });
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.freeze({ ...value });
  }
  return value;
}

function isPlainObjectOrNull(value) {
  return value === null || (typeof value === 'object' && !Array.isArray(value));
}

function isNonNegativeNumberOrNull(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function isFiniteNumberOrNull(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function pushFieldError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getAccountTradingOwner() {
  return ACCOUNT_TRADING_OWNER;
}

export function getAccountReadoutAllowedFields() {
  return [...ACCOUNT_READOUT_ALLOWED_FIELDS];
}

export function getTradeDraftAllowedFields() {
  return [...TRADE_DRAFT_ALLOWED_FIELDS];
}

export function getTradeDraftAllowedSides() {
  return [...TRADE_DRAFT_ALLOWED_SIDES];
}

export function getTradeDraftAllowedOrderTypes() {
  return [...TRADE_DRAFT_ALLOWED_ORDER_TYPES];
}

export function getTradeDraftAllowedTimeInForce() {
  return [...TRADE_DRAFT_ALLOWED_TIME_IN_FORCE];
}

export function getAccountTradingBlockedIntegrations() {
  return [...ACCOUNT_TRADING_BLOCKED_INTEGRATIONS];
}

export function createDefaultAccountReadout(input = {}) {
  return Object.freeze({
    accountId: normalizeOptionalText(input.accountId, DEFAULT_ACCOUNT_READOUT.accountId),
    availableBalance: normalizeOptionalNumber(input.availableBalance, DEFAULT_ACCOUNT_READOUT.availableBalance),
    balance: normalizeOptionalNumber(input.balance, DEFAULT_ACCOUNT_READOUT.balance),
    currency: normalizeOptionalText(input.currency, DEFAULT_ACCOUNT_READOUT.currency),
    equity: normalizeOptionalNumber(input.equity, DEFAULT_ACCOUNT_READOUT.equity),
    margin: normalizeOptionalNumber(input.margin, DEFAULT_ACCOUNT_READOUT.margin),
    metadata: normalizeObject(input.metadata, DEFAULT_ACCOUNT_READOUT.metadata),
    realizedPnl: normalizeOptionalNumber(input.realizedPnl, DEFAULT_ACCOUNT_READOUT.realizedPnl),
    unrealizedPnl: normalizeOptionalNumber(input.unrealizedPnl, DEFAULT_ACCOUNT_READOUT.unrealizedPnl),
  });
}

export function createDefaultTradeDraft(input = {}) {
  return Object.freeze({
    metadata: normalizeObject(input.metadata, DEFAULT_TRADE_DRAFT.metadata),
    orderType: normalizeOptionalText(input.orderType, DEFAULT_TRADE_DRAFT.orderType),
    price: normalizeOptionalNumber(input.price, DEFAULT_TRADE_DRAFT.price),
    quantity: normalizeOptionalNumber(input.quantity, DEFAULT_TRADE_DRAFT.quantity),
    sessionId: normalizeOptionalText(input.sessionId, DEFAULT_TRADE_DRAFT.sessionId),
    side: normalizeOptionalText(input.side, DEFAULT_TRADE_DRAFT.side),
    stopLoss: normalizeOptionalNumber(input.stopLoss, DEFAULT_TRADE_DRAFT.stopLoss),
    symbol: normalizeOptionalText(input.symbol, DEFAULT_TRADE_DRAFT.symbol),
    takeProfit: normalizeOptionalNumber(input.takeProfit, DEFAULT_TRADE_DRAFT.takeProfit),
    timeInForce: normalizeOptionalText(input.timeInForce, DEFAULT_TRADE_DRAFT.timeInForce),
  });
}

export function createDefaultAccountTradingIntent(input = {}) {
  return Object.freeze({
    accountReadout: createDefaultAccountReadout(input.accountReadout),
    analyticsEnabled: false,
    controlsEnabled: false,
    readOnly: true,
    tradeDraft: createDefaultTradeDraft(input.tradeDraft),
  });
}

export function validateAccountReadout(readout = {}) {
  const candidate = {
    ...DEFAULT_ACCOUNT_READOUT,
    ...readout,
  };
  const errors = [];

  if (candidate.accountId !== null && !String(candidate.accountId || '').trim()) {
    pushFieldError(errors, 'accountId', 'Account readout accountId must be null or a non-empty string.');
  }
  for (const field of ['balance', 'availableBalance', 'equity', 'margin']) {
    if (!isNonNegativeNumberOrNull(candidate[field])) {
      pushFieldError(errors, field, `Account readout ${field} must be null or a non-negative number.`);
    }
  }
  for (const field of ['realizedPnl', 'unrealizedPnl']) {
    if (!isFiniteNumberOrNull(candidate[field])) {
      pushFieldError(errors, field, `Account readout ${field} must be null or a finite number.`);
    }
  }
  if (!String(candidate.currency || '').trim()) {
    pushFieldError(errors, 'currency', 'Account readout currency must be a non-empty string.');
  }
  if (!isPlainObjectOrNull(candidate.metadata)) {
    pushFieldError(errors, 'metadata', 'Account readout metadata must be an object or null.');
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function validateTradeDraft(draft = {}) {
  const candidate = {
    ...DEFAULT_TRADE_DRAFT,
    ...draft,
  };
  const errors = [];

  if (!TRADE_DRAFT_ALLOWED_SIDES.includes(candidate.side)) {
    pushFieldError(errors, 'side', 'Trade draft side must be buy or sell.');
  }
  if (!String(candidate.symbol || '').trim()) {
    pushFieldError(errors, 'symbol', 'Trade draft symbol must be a non-empty string.');
  }
  if (!(typeof candidate.quantity === 'number' && Number.isFinite(candidate.quantity) && candidate.quantity > 0)) {
    pushFieldError(errors, 'quantity', 'Trade draft quantity must be a positive number.');
  }
  if (!TRADE_DRAFT_ALLOWED_ORDER_TYPES.includes(candidate.orderType)) {
    pushFieldError(errors, 'orderType', 'Trade draft orderType must be a supported built-in order type.');
  }
  for (const field of ['price', 'stopLoss', 'takeProfit']) {
    if (!isNonNegativeNumberOrNull(candidate[field])) {
      pushFieldError(errors, field, `Trade draft ${field} must be null or a non-negative number.`);
    }
  }
  if (!TRADE_DRAFT_ALLOWED_TIME_IN_FORCE.includes(candidate.timeInForce)) {
    pushFieldError(errors, 'timeInForce', 'Trade draft timeInForce must be supported.');
  }
  if (candidate.sessionId !== null && !String(candidate.sessionId || '').trim()) {
    pushFieldError(errors, 'sessionId', 'Trade draft sessionId must be null or a non-empty string.');
  }
  if (!isPlainObjectOrNull(candidate.metadata)) {
    pushFieldError(errors, 'metadata', 'Trade draft metadata must be an object or null.');
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function validateAccountTradingIntent(intent = {}) {
  const accountResult = validateAccountReadout(intent.accountReadout);
  const draftResult = validateTradeDraft(intent.tradeDraft);
  const errors = [
    ...accountResult.errors.map((error) => Object.freeze({ ...error, section: 'accountReadout' })),
    ...draftResult.errors.map((error) => Object.freeze({ ...error, section: 'tradeDraft' })),
  ];

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function createAccountTradingContract() {
  return Object.freeze({
    accountMutationReady: false,
    accountReadoutAllowedFields: getAccountReadoutAllowedFields(),
    analyticsCalculationReady: false,
    blockedIntegrations: getAccountTradingBlockedIntegrations(),
    bottomChromeControlsEnabled: false,
    commandSurfaceReady: false,
    intentReady: true,
    orderPlacementReady: false,
    ordersRuntimeBridgeReady: false,
    owner: ACCOUNT_TRADING_OWNER,
    persistenceReady: false,
    positionMutationReady: false,
    runtimeWiringReady: false,
    tradeDraftAllowedFields: getTradeDraftAllowedFields(),
    tradeDraftAllowedOrderTypes: getTradeDraftAllowedOrderTypes(),
    tradeDraftAllowedSides: getTradeDraftAllowedSides(),
    tradeDraftAllowedTimeInForce: getTradeDraftAllowedTimeInForce(),
    writeReady: false,
  });
}
