import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createAccountTradingContract,
  createDefaultAccountReadout,
  createDefaultAccountTradingIntent,
  createDefaultTradeDraft,
  getAccountReadoutAllowedFields,
  getAccountTradingBlockedIntegrations,
  getAccountTradingOwner,
  getTradeDraftAllowedFields,
  getTradeDraftAllowedOrderTypes,
  getTradeDraftAllowedSides,
  getTradeDraftAllowedTimeInForce,
  validateAccountReadout,
  validateAccountTradingIntent,
  validateTradeDraft,
} from '../src/account-trading/account-trading-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const contractSource = await readFile('v6/src/account-trading/account-trading-contract.js', 'utf8');
const contractDoc = await readFile('v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md', 'utf8');
const docsIndex = await readFile('v6/docs/INDEX.md', 'utf8');
const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md', 'utf8');
const bottomReservationDoc = await readFile('v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md', 'utf8');

assert.equal(getAccountTradingOwner(), 'account-trading-runtime');
assert.deepEqual(getAccountReadoutAllowedFields(), [
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
assert.deepEqual(getTradeDraftAllowedFields(), [
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
assert.deepEqual(getTradeDraftAllowedSides(), ['buy', 'sell']);
assert.deepEqual(getTradeDraftAllowedOrderTypes(), ['market', 'limit', 'stop']);
assert.deepEqual(getTradeDraftAllowedTimeInForce(), ['day', 'gtc']);
assert.deepEqual(getAccountTradingBlockedIntegrations(), [
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

assert.deepEqual(createDefaultAccountReadout(), {
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
assert.deepEqual(createDefaultTradeDraft(), {
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

const intent = createDefaultAccountTradingIntent();
assert.deepEqual(intent, {
  accountReadout: createDefaultAccountReadout(),
  analyticsEnabled: false,
  controlsEnabled: false,
  readOnly: true,
  tradeDraft: createDefaultTradeDraft(),
});
assert.equal(Object.isFrozen(intent), true);
assert.equal(Object.isFrozen(intent.accountReadout), true);
assert.equal(Object.isFrozen(intent.tradeDraft), true);
assert.deepEqual(validateAccountTradingIntent(intent), { errors: [], valid: true });

const custom = createDefaultAccountTradingIntent({
  accountReadout: {
    accountId: 'SIM-1',
    availableBalance: '99000',
    balance: 100000,
    currency: 'USD',
    equity: 100250,
    margin: 2500,
    metadata: { source: 'fixture' },
    realizedPnl: -120.5,
    unrealizedPnl: 370.5,
  },
  analyticsEnabled: true,
  controlsEnabled: true,
  readOnly: false,
  tradeDraft: {
    metadata: { note: 'read-only draft' },
    orderType: 'limit',
    price: '101.25',
    quantity: '2',
    sessionId: 'v6-session-0001',
    side: 'sell',
    stopLoss: 103,
    symbol: 'NQ',
    takeProfit: 99.5,
    timeInForce: 'gtc',
  },
});
assert.deepEqual(custom, {
  accountReadout: {
    accountId: 'SIM-1',
    availableBalance: 99000,
    balance: 100000,
    currency: 'USD',
    equity: 100250,
    margin: 2500,
    metadata: { source: 'fixture' },
    realizedPnl: -120.5,
    unrealizedPnl: 370.5,
  },
  analyticsEnabled: false,
  controlsEnabled: false,
  readOnly: true,
  tradeDraft: {
    metadata: { note: 'read-only draft' },
    orderType: 'limit',
    price: 101.25,
    quantity: 2,
    sessionId: 'v6-session-0001',
    side: 'sell',
    stopLoss: 103,
    symbol: 'NQ',
    takeProfit: 99.5,
    timeInForce: 'gtc',
  },
});
assert.deepEqual(validateAccountTradingIntent(custom), { errors: [], valid: true });

const invalidReadout = validateAccountReadout({
  accountId: '',
  availableBalance: -1,
  balance: 'bad',
  currency: '',
  equity: -1,
  margin: -1,
  metadata: ['bad'],
  realizedPnl: Number.NaN,
  unrealizedPnl: 'bad',
});
assert.equal(invalidReadout.valid, false);
assert.deepEqual(
  invalidReadout.errors.map((error) => error.field),
  ['accountId', 'balance', 'availableBalance', 'equity', 'margin', 'realizedPnl', 'unrealizedPnl', 'currency', 'metadata'],
);

const invalidDraft = validateTradeDraft({
  metadata: ['bad'],
  orderType: 'trailing',
  price: -1,
  quantity: 0,
  sessionId: '',
  side: 'long',
  stopLoss: -1,
  symbol: '',
  takeProfit: -1,
  timeInForce: 'ioc',
});
assert.equal(invalidDraft.valid, false);
assert.deepEqual(
  invalidDraft.errors.map((error) => error.field),
  ['side', 'symbol', 'quantity', 'orderType', 'price', 'stopLoss', 'takeProfit', 'timeInForce', 'sessionId', 'metadata'],
);

assert.deepEqual(createAccountTradingContract(), {
  accountMutationReady: false,
  accountReadoutAllowedFields: getAccountReadoutAllowedFields(),
  analyticsCalculationReady: false,
  blockedIntegrations: getAccountTradingBlockedIntegrations(),
  bottomChromeControlsEnabled: false,
  commandSurfaceReady: false,
  intentReady: true,
  orderPlacementReady: false,
  ordersRuntimeBridgeReady: false,
  owner: 'account-trading-runtime',
  persistenceReady: false,
  positionMutationReady: false,
  runtimeWiringReady: false,
  tradeDraftAllowedFields: getTradeDraftAllowedFields(),
  tradeDraftAllowedOrderTypes: getTradeDraftAllowedOrderTypes(),
  tradeDraftAllowedSides: getTradeDraftAllowedSides(),
  tradeDraftAllowedTimeInForce: getTradeDraftAllowedTimeInForce(),
  writeReady: false,
});
assert.equal(Object.isFrozen(createAccountTradingContract()), true);
assert.match(selectionDoc, /Account\/Trading Owner\s+Contract/);
assert.match(selectionDoc, /distinct from the existing `orders-runtime` dashboard row-action\s+contract/);
assert.match(contractDoc, /# V6 Account\/Trading Owner Contract/);
assert.match(contractDoc, /Step 141 establishes the account\/trading owner contract/);
assert.match(contractDoc, /Lightweight Charts/);
assert.match(docsIndex, /V6_ACCOUNT_TRADING_OWNER_CONTRACT\.md/);
assert.match(bottomReservationDoc, /Buy, Sell, quantity, and analytics controls are disabled/);

for (const forbiddenToken of [
  'ACCOUNT_TRADING_COMMANDS',
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'DRAWING_ACTION_HISTORY_COMMANDS',
  'INDICATORS_COMMANDS',
  'ORDERS_COMMANDS',
  'REPLAY_COMMANDS',
  'SCREENSHOT_EXPORT_COMMANDS',
  'SESSION_SETTINGS_COMMANDS',
  'SETTINGS_COMMANDS',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'createChart',
  'series.setData',
  'series.update',
  'setVisibleLogicalRange',
  'addLineSeries',
  'addHistogramSeries',
  'localStorage',
  'fetch(',
  'XMLHttpRequest',
]) {
  assert.equal(contractSource.includes(forbiddenToken), false, `account trading contract must not expose ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 account trading contract smoke passed');
