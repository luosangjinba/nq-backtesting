import assert from 'node:assert/strict';

import {
  clearOrderReviews,
  getOrderReviewById,
  getOrderReviews,
  loadOrderReviews,
  updateOrderReview,
} from '../src/order/order-review-store.js';
import {
  ORDER_DIRECTIONS,
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
  ORDER_RESULTS,
} from '../src/order/order-review-types.js';
import {
  clearActiveReviewSet,
  createChartReviewSet,
  getActiveReviewSet,
  getActiveReviewSetId,
  linkRefToActiveReviewSet,
  setActiveReviewSet,
  updateActiveReviewSet,
} from '../src/order/order-review-active.js';
import {
  handleOrderSetupChartAction,
  renderOrderSetupMenuItems,
} from '../src/order/order-setup-chart-actions.js';
import { getSetupSetById } from '../src/order/setup-set.js';
import {
  restoreOrderReviews,
  saveOrderReviews,
} from '../src/order/order-review-persistence.js';
import {
  canRedo,
  canUndo,
  recordHistory,
  redo,
  undo,
} from '../src/history/history-manager.js';

function installLocalStorageMock() {
  const items = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) {
        return items.has(key) ? items.get(key) : null;
      },
      setItem(key, value) {
        items.set(key, String(value));
      },
      removeItem(key) {
        items.delete(key);
      },
      clear() {
        items.clear();
      },
    },
  };
  return items;
}

function assertSetupCore(setupSet, expected) {
  assert.ok(setupSet, 'setup set exists');
  assert.equal(setupSet.direction, expected.direction);
  assert.equal(setupSet.orderElements.reversal.timestamp, expected.reversalTimestamp);
  assert.equal(setupSet.orderElements.entry.timestamp, expected.entryTimestamp);
  assert.equal(setupSet.orderElements.entry.price, expected.entryPrice);
  assert.equal(setupSet.orderElements.stopLoss.price, expected.stopPrice);
  assert.equal(setupSet.orderElements.targets.find((target) => target.role === 'target1')?.price, expected.target1);
  assert.equal(setupSet.orderElements.result.status, expected.result);
  assert.equal(setupSet.orderElements.result.price, expected.target1);
  assert.equal(setupSet.orderElements.result.outcomePoints, expected.points);
  assert.equal(setupSet.orderElements.result.outcomeR, expected.r);
}

installLocalStorageMock();
clearActiveReviewSet();
clearOrderReviews();

const bullish = createChartReviewSet({
  bar: { timestamp: 1672756200 },
  price: 11000,
  direction: ORDER_DIRECTIONS.LONG,
  timeframe: '1M',
  eventType: ORDER_EVENT_TYPES.SWEEP_LIQUIDITY,
});
assert.ok(bullish?.id, 'bullish setup created');
assert.equal(getActiveReviewSetId(), bullish.id, 'created setup becomes active');

updateActiveReviewSet({
  entryPlan: {
    entryTimestamp: 1672756260,
    entryTimeframe: '1M',
    entryPrice: 11010,
    stopLoss: 11000,
    targetInternal: 11030,
  },
  resultReview: {
    result: ORDER_RESULTS.TARGET1,
    exitTimestamp: 1672756800,
  },
  summary: 'Opening reversal setup summary.',
});

linkRefToActiveReviewSet({
  type: ORDER_REF_TYPES.PDA,
  id: 'pda_smoke_1',
  role: ORDER_REF_ROLES.CONTEXT,
  sourceChartId: 'primary',
  sourceTimeframeLabel: '1M',
});

updateOrderReview(bullish.id, {
  setupThesis: {
    reasons: [
      {
        id: 'reason_1',
        note: 'PDA reaction confirmed.',
        refs: [
          {
            type: ORDER_REF_TYPES.SEGMENT,
            id: 'segment_smoke_1',
            role: ORDER_REF_ROLES.CONTEXT,
          },
        ],
      },
      {
        id: 'reason_2',
        note: 'SMT confirmation.',
        refs: [
          {
            type: ORDER_REF_TYPES.SMT,
            id: 'smt_smoke_1',
            role: ORDER_REF_ROLES.CONFIRMATION,
          },
          {
            type: ORDER_REF_TYPES.COMPOSITE,
            id: 'composite_smoke_1',
            role: ORDER_REF_ROLES.CONTEXT,
          },
        ],
      },
    ],
  },
});

const updatedBullish = getSetupSetById(bullish.id);
assertSetupCore(updatedBullish, {
  direction: ORDER_DIRECTIONS.LONG,
  reversalTimestamp: 1672756200,
  entryTimestamp: 1672756260,
  entryPrice: 11010,
  stopPrice: 11000,
  target1: 11030,
  result: ORDER_RESULTS.TARGET1,
  points: 20,
  r: 2,
});
assert.equal(updatedBullish.explanationElements.refs.length, 3, 'reason refs are exposed through setup set');
assert.equal(updatedBullish.explanationElements.notes.length, 2, 'reason notes become explanation notes');
assert.equal(getOrderReviewById(bullish.id).summary, 'Opening reversal setup summary.', 'order setup summary persists');

const shiftOrderSetupMenu = renderOrderSetupMenuItems({
  bar: { timestamp: 1672756860 },
  isShift: true,
});
assert.match(shiftOrderSetupMenu, /order-setup-set-all-end/, 'shift setup menu includes Set All End action');
assert.match(shiftOrderSetupMenu, /order-setup-set-market-structure-shift/, 'setup menu includes MSS action');
assert.match(shiftOrderSetupMenu, /order-setup-set-market-structure-shift-end/, 'shift setup menu includes MSS end action');
assert.match(shiftOrderSetupMenu, /Targets/, 'setup menu groups target actions in a nested submenu');
assert.match(shiftOrderSetupMenu, /Target Internal 3/, 'setup menu includes internal target variants');
assert.match(shiftOrderSetupMenu, /Target External 2/, 'setup menu includes external target variants');
assert.match(shiftOrderSetupMenu, /Target External The Best/, 'setup menu includes best external target');
assert.equal(handleOrderSetupChartAction('order-setup-set-market-structure-shift', {
  bar: { timestamp: 1672756320, high: 11025, low: 11015 },
  timeframe: '1M',
  price: 11020,
}), true, 'set MSS action is handled');
const mssSetup = getSetupSetById(bullish.id);
assert.equal(mssSetup.orderElements.marketStructureShift.price, 11020, 'MSS price is derived');
assert.equal(mssSetup.orderElements.marketStructureShift.timestamp, 1672756320, 'MSS timestamp is derived');
assert.equal(handleOrderSetupChartAction('order-setup-set-market-structure-shift-end', {
  bar: { timestamp: 1672756740 },
  timeframe: '1M',
}), true, 'set MSS end action is handled');
assert.equal(getOrderReviewById(bullish.id).entryPlan.marketStructureShiftEndTimestamp, 1672756740, 'MSS end is set independently');
assert.equal(handleOrderSetupChartAction('order-setup-set-all-end', {
  bar: { timestamp: 1672756860 },
  timeframe: '1M',
}), true, 'set all end action is handled');
const allEndEntryPlan = getOrderReviewById(bullish.id).entryPlan;
assert.equal(allEndEntryPlan.marketStructureShiftEndTimestamp, 1672756740, 'Set All End does not overwrite MSS end');
[
  'entryEndTimestamp',
  'stopLossEndTimestamp',
  'targetInternalEndTimestamp',
  'targetInternal2EndTimestamp',
  'targetInternal3EndTimestamp',
  'targetSwingEndTimestamp',
  'targetExternalEndTimestamp',
  'targetExternal2EndTimestamp',
  'finalTargetEndTimestamp',
].forEach((field) => {
  assert.equal(allEndEntryPlan[field], 1672756860, `${field} uses common end timestamp`);
});
[
  'entryEndTimeframe',
  'stopLossEndTimeframe',
  'targetInternalEndTimeframe',
  'targetInternal2EndTimeframe',
  'targetInternal3EndTimeframe',
  'targetSwingEndTimeframe',
  'targetExternalEndTimeframe',
  'targetExternal2EndTimeframe',
  'finalTargetEndTimeframe',
].forEach((field) => {
  assert.equal(allEndEntryPlan[field], '1M', `${field} uses common end timeframe`);
});

const bearish = createChartReviewSet({
  bar: { timestamp: 1672763400 },
  price: 11100,
  direction: ORDER_DIRECTIONS.SHORT,
  timeframe: '1M',
  eventType: ORDER_EVENT_TYPES.TOUCH_FVG,
});
assert.ok(bearish?.id, 'bearish setup created');
assert.equal(setActiveReviewSet(bullish.id)?.id, bullish.id, 'set active works');
assert.equal(getActiveReviewSet()?.id, bullish.id, 'active setup can be read');

saveOrderReviews();
const persistedRaw = window.localStorage.getItem('v4:order-reviews:NQ');
assert.ok(persistedRaw, 'order reviews persisted');

loadOrderReviews([]);
clearActiveReviewSet();
assert.equal(getOrderReviews().length, 0, 'load empty clears order reviews');
restoreOrderReviews();
assert.equal(getOrderReviews().length, 2, 'order reviews restored from localStorage');
assert.ok(getOrderReviewById(bullish.id), 'bullish setup restored');
assert.ok(getOrderReviewById(bearish.id), 'bearish setup restored');

recordHistory('Smoke Update Entry', () => {
  updateOrderReview(bullish.id, {
    entryPlan: {
      entryPrice: 11012,
    },
  });
});
assert.equal(getOrderReviewById(bullish.id).entryPlan.entryPrice, 11012, 'history mutation applied');
assert.equal(canUndo(), true, 'undo available after history mutation');
assert.equal(undo(), true, 'undo succeeds');
assert.equal(getOrderReviewById(bullish.id).entryPlan.entryPrice, 11010, 'undo restores previous entry');
assert.equal(canRedo(), true, 'redo available after undo');
assert.equal(redo(), true, 'redo succeeds');
assert.equal(getOrderReviewById(bullish.id).entryPlan.entryPrice, 11012, 'redo reapplies entry update');

console.log('order setup smoke ok');
