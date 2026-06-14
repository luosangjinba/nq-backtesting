import assert from 'node:assert/strict';

import {
  addOrderReview,
  clearOrderReviews,
  getOrderReviewById,
} from '../src/order/order-review-store.js';
import {
  addLiveRecord,
  getLiveRecordById,
  loadLiveRecords,
} from '../src/live-record/live-record-store.js';
import {
  getActiveLiveRecordId,
  initLiveRecordActive,
} from '../src/live-record/live-record-active.js';
import {
  handleLiveRecordChartAction,
  renderLiveRecordMenuItems,
} from '../src/live-record/live-record-chart-actions.js';
import {
  LIVE_RECORD_LINE_LENGTH_BARS,
  getLiveRecordElementLineLength,
} from '../src/live-record/live-record-projection.js';
import { hitTestLiveRecordElements } from '../src/live-record/live-record-hit-test.js';
import { getSelectedLiveRecordElement } from '../src/live-record/live-record-selection.js';

function resetState() {
  clearOrderReviews();
  loadLiveRecords([]);
}

resetState();
initLiveRecordActive();

const setup = addOrderReview({
  id: 'setup-chart-actions',
  instrument: 'NQ',
  setupThesis: {
    primaryEventTimestamp: 1710770400,
    primaryEventTimeframe: '1H',
    reasons: [{ id: 'reason_1', category: 'other', note: '', refs: [] }],
  },
}, { now: 1 });

const inactiveMenu = renderLiveRecordMenuItems({ bar: { timestamp: 1710770400 } });
assert.match(inactiveMenu, /No active live record/, 'inactive menu labels no active live record');
assert.match(inactiveMenu, /Create Bullish Live Record Here/, 'inactive menu renders bullish create');
assert.match(inactiveMenu, /Create Bearish Live Record Here/, 'inactive menu renders bearish create');
assert.match(inactiveMenu, /Set Entry Here/, 'inactive menu still renders write action shell');

assert.equal(handleLiveRecordChartAction('live-record-create-bullish', {
  bar: { timestamp: 1710770340, close: 18360 },
  price: 18360,
  timeframe: '1H',
}), true, 'bullish create action is handled');
assert.equal(getLiveRecordById(getActiveLiveRecordId()).direction, 'long', 'bullish create stores long direction');
loadLiveRecords([]);

assert.equal(handleLiveRecordChartAction('live-record-create-bearish', {
  bar: { timestamp: 1710770400, close: 18366.25 },
  price: 18366.5,
  timeframe: '1H',
}), true, 'bearish create action is handled');
const liveRecordId = getActiveLiveRecordId();
assert.ok(liveRecordId, 'new live record becomes active');
assert.equal(getLiveRecordById(liveRecordId).direction, 'short', 'bearish create stores short direction');

assert.equal(handleLiveRecordChartAction('live-record-set-entry', {
  bar: { timestamp: 1710770460, close: 18361 },
  price: 18361.25,
  timeframe: '5M',
}), true, 'set entry action is handled');
assert.equal(handleLiveRecordChartAction('live-record-set-market-structure-shift', {
  bar: { timestamp: 1710770520, close: 18358 },
  price: 18358.75,
  timeframe: '5M',
}), true, 'set MSS action is handled');
assert.equal(handleLiveRecordChartAction('live-record-set-stop-loss', {
  bar: { timestamp: 1710770520, close: 18372 },
  price: 18372.5,
  timeframe: '5M',
}), true, 'set stop action is handled');
assert.equal(handleLiveRecordChartAction('live-record-set-target-external-1', {
  bar: { timestamp: 1710770580, close: 18325 },
  price: 18325.5,
  timeframe: '5M',
}), true, 'set target action is handled');
assert.equal(handleLiveRecordChartAction('live-record-set-result-exit', {
  bar: { timestamp: 1710770640, close: 18330 },
  price: 18330.25,
  timeframe: '1M',
}), true, 'set result action is handled');
assert.equal(handleLiveRecordChartAction('live-record-set-all-ends', {
  bar: { timestamp: 1710770700, close: 18331 },
  price: 18331,
  timeframe: '1M',
}), true, 'set all ends action is handled');

const updated = getLiveRecordById(liveRecordId);
assert.equal(updated.execution.entry.endTimestamp, 1710770700, 'set all ends updates entry end');
assert.equal(updated.execution.marketStructureShift.endTimestamp, 1710770700, 'set all ends updates MSS end');
assert.equal(updated.execution.stopLoss.endTimestamp, 1710770700, 'set all ends updates stop end');
assert.equal(updated.execution.targets[0].role, 'targetExternal1', 'target role is stored');
assert.equal(updated.result.exitPrice, 18330.25, 'result exit price is stored');

assert.equal(handleLiveRecordChartAction('live-record-link-pda', {
  pdaHit: { id: 'pda-chart-action', type: 'fvg' },
}), true, 'link pda action is handled');
assert.equal(handleLiveRecordChartAction('live-record-link-pda', {
  pdaHit: { id: 'pda-chart-action', type: 'fvg' },
}), true, 'duplicate pda link is handled');
assert.equal(getLiveRecordById(liveRecordId).linkedObjectRefs.length, 1, 'evidence link is de-duped');
assert.equal(getOrderReviewById(setup.id).setupThesis.reasons[0].refs.length, 0, 'live evidence link does not mutate setup refs');

assert.equal(getLiveRecordElementLineLength({ lineLengthBars: null }), LIVE_RECORD_LINE_LENGTH_BARS, 'null line length uses fallback');

const hit = hitTestLiveRecordElements({
  x: 110,
  y: 250,
  context: {
    timeframe: 5,
    getDisplayBars: () => [{ timestamp: 1710770400, high: 18365, low: 18355 }],
    timeToCoordinate: (time) => (Number(time) === 1710770400 ? 100 : null),
    priceToCoordinate: (value) => (Number(value) === 18361.25 ? 250 : null),
  },
}).primaryHit;
assert.equal(hit?.liveRecordId, liveRecordId, 'hit-test returns live record id');
assert.equal(hit?.element, 'entry', 'hit-test returns element role');

assert.equal(handleLiveRecordChartAction('live-record-hit-select-element', {
  liveRecordId,
  liveRecordElement: 'entry',
}), true, 'select hit action is handled');
assert.equal(getSelectedLiveRecordElement()?.element, 'entry', 'selection state stores selected element');
assert.equal(handleLiveRecordChartAction('live-record-hit-hide-element', {
  liveRecordId,
  liveRecordElement: 'entry',
}), true, 'hide hit action is handled');
assert.equal(getLiveRecordById(liveRecordId).display.elementVisibility.entry, false, 'hide hit action updates element visibility');
assert.equal(handleLiveRecordChartAction('live-record-hit-delete-element', {
  liveRecordId,
  liveRecordElement: 'targetExternal1',
}), true, 'delete element hit action is handled');
assert.equal(getLiveRecordById(liveRecordId).execution.targets.length, 0, 'delete element removes selected target only');

const extra = addLiveRecord({
  id: 'live-delete-target',
  instrument: 'NQ',
  anchor: { timestamp: 1710770400, timeframe: '1H', price: 18366.5 },
}, { now: 2 });
assert.equal(handleLiveRecordChartAction('live-record-hit-delete-record', {
  liveRecordId: extra.id,
}), true, 'delete record hit action is handled');
assert.equal(getLiveRecordById(extra.id), null, 'delete record removes live record');
assert.ok(getOrderReviewById(setup.id), 'delete live record does not delete setup');

console.log('live record chart actions smoke ok');
