import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md', 'utf8');
const drawingActionHistoryContractDoc = await readFile('v6/docs/V6_DRAWING_ACTION_HISTORY_OWNER_CONTRACT.md', 'utf8');
const bottomReservationDoc = await readFile('v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md', 'utf8');
const bottomAuditDoc = await readFile('v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md', 'utf8');
const reAuditDoc = await readFile('v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md'), true);
assert.match(selectionDoc, /Account\/Trading Owner\s+Contract/);
assert.match(selectionDoc, /Step 141 should establish an account\/trading owner contract/);
assert.match(selectionDoc, /without making the\s+bottom account\/trading chrome interactive/);
assert.match(selectionDoc, /account id, balance,\s+available balance, equity, realized PnL, unrealized PnL, margin, currency,\s+and metadata/);
assert.match(selectionDoc, /side, symbol, quantity, order\s+type, price, stop loss, take profit, time in force, session id, and metadata/);
assert.match(selectionDoc, /default read-only account\/trading intent state and validation helpers/);
assert.match(selectionDoc, /avoid order placement, position mutation, account mutation, analytics\s+calculation/);
assert.match(selectionDoc, /distinct from the existing `orders-runtime` dashboard row-action\s+contract/);
assert.match(selectionDoc, /dashboard visible row actions from Summary, Stats, Copy, and\s+Journal/);

assert.match(drawingActionHistoryContractDoc, /drawing\/action-history owner contract/);
assert.match(bottomReservationDoc, /bottom account\/trading chrome strip/);
assert.match(bottomReservationDoc, /Buy, Sell, quantity, and analytics controls are disabled/);
assert.match(bottomAuditDoc, /Buy, Sell, quantity, account balance, PnL, and analytics remain placeholders/);
assert.match(reAuditDoc, /account\/trading, analytics, Order, and Calendar behavior/);
assert.match(parityGapDoc, /Owner contract selection for one deferred interactive family/);
assert.match(parityGapDoc, /account\/trading/);
assert.match(guardrailsDoc, /Trading\/account chrome stays along the bottom edge/);
assert.match(shellSource, /data-v6-bottom-account-chrome/);
assert.match(shellSource, /data-v6-bottom-buy disabled/);
assert.match(shellSource, /data-v6-bottom-sell disabled/);
assert.match(shellSource, /data-v6-bottom-quantity/);
assert.match(shellSource, /data-v6-bottom-analytics disabled/);
assert.match(shellSource, /data-v6-bottom-account-balance>Balance --/);
assert.match(shellSource, /data-v6-bottom-realized-pnl>Realized --/);
assert.match(shellSource, /data-v6-bottom-unrealized-pnl>Unrealized --/);

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
  'createChart',
  'series.setData',
  'series.update',
  'setVisibleLogicalRange',
  'addLineSeries',
  'addHistogramSeries',
  'localStorage',
]) {
  assert.equal(selectionDoc.includes(forbiddenToken), false, `selection doc must not choose runtime-owned ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation chart slice selection step 140 smoke passed');
