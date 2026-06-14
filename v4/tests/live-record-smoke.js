import assert from 'node:assert/strict';

import {
  addOrderReview,
  clearOrderReviews,
  getOrderReviewById,
} from '../src/order/order-review-store.js';
import {
  getActiveReviewSetId,
  setActiveReviewSet,
} from '../src/order/order-review-active.js';
import {
  addLiveRecord,
  getLiveRecordById,
  getLiveRecords,
  loadLiveRecords,
  updateLiveRecord,
} from '../src/live-record/live-record-store.js';
import {
  getActiveLiveRecordId,
  initLiveRecordActive,
} from '../src/live-record/live-record-active.js';
import {
  clearSavedLiveRecords,
  getLiveRecordStorageKey,
  restoreLiveRecords,
  saveLiveRecords,
} from '../src/live-record/live-record-persistence.js';
import {
  handleLiveRecordChartAction,
  renderLiveRecordMenuItems,
} from '../src/live-record/live-record-chart-actions.js';
import { getCalendarDayGroups } from '../src/calendar/calendar-review-index.js';
import { CALENDAR_OBJECT_TYPES } from '../src/calendar/calendar-types.js';
import { renderLiveRecordDetailPanel } from '../src/ui/inspector/live-record-panel.js';
import { createLiveRecordActionController } from '../src/ui/inspector/live-record-actions.js';
import { recordHistory, redo, undo } from '../src/history/history-manager.js';

const storageData = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageData.has(key) ? storageData.get(key) : null),
  setItem: (key, value) => storageData.set(key, String(value)),
  removeItem: (key) => storageData.delete(key),
};

function resetState() {
  clearOrderReviews();
  loadLiveRecords([]);
  storageData.clear();
}

function makeTarget(liveRecordId, dataset = {}) {
  return {
    dataset: { liveRecordId, ...dataset },
    value: dataset.value || '',
    checked: Boolean(dataset.checked),
  };
}

resetState();
initLiveRecordActive();

const setup = addOrderReview({
  id: 'setup-live-smoke',
  instrument: 'NQ',
  setupThesis: {
    primaryEventTimestamp: 1710770400,
    primaryEventTimeframe: '1H',
  },
}, { now: 1 });
assert.equal(setActiveReviewSet(setup.id)?.id, setup.id, 'active setup can be set');

const record = addLiveRecord({
  id: 'live-smoke',
  instrument: 'NQ',
  direction: 'bearish',
  status: 'open',
  orderSetupId: setup.id,
  anchor: { timestamp: 1710770400, timeframe: '1h', price: '18366.36' },
  summary: 'Initial live record',
}, { now: 2 });
assert.equal(record.direction, 'short', 'direction alias normalizes');
assert.equal(record.status, 'active', 'status alias normalizes');
assert.equal(record.anchor.timeframe, '1H', 'timeframe alias normalizes');
record.summary = 'mutated outside';
assert.equal(getLiveRecordById('live-smoke').summary, 'Initial live record', 'store returns clones');
assert.equal(getOrderReviewById(setup.id).id, setup.id, 'adding live record does not mutate setup');

assert.equal(saveLiveRecords('NQ'), true, 'NQ live records save');
assert.ok(storageData.has(getLiveRecordStorageKey('NQ')), 'NQ live record key is instrument-scoped');
loadLiveRecords([]);
addLiveRecord({
  id: 'live-es',
  instrument: 'ES',
  anchor: { timestamp: 1710770500 },
}, { now: 3 });
assert.equal(saveLiveRecords('ES'), true, 'ES live records save');
loadLiveRecords([]);
assert.equal(restoreLiveRecords('NQ'), 1, 'NQ restore loads one record');
assert.equal(getLiveRecordById('live-smoke').instrument, 'NQ', 'NQ record restored');
loadLiveRecords([]);
assert.equal(restoreLiveRecords('ES'), 1, 'ES restore loads one record');
assert.equal(getLiveRecordById('live-es').instrument, 'ES', 'ES record restored');
assert.equal(clearSavedLiveRecords('ES'), true, 'clear saved ES live records');

loadLiveRecords([]);
assert.match(renderLiveRecordMenuItems({ bar: { timestamp: 1710770400 } }), /New Live Record Here/, 'chart menu renders live record entry');
const activeSetupBefore = getActiveReviewSetId();
assert.equal(handleLiveRecordChartAction('live-record-new-here', {
  bar: { timestamp: 1710770400, close: 18366.25 },
  price: 18366.5,
  timeframe: '1H',
}), true, 'chart action handles live record creation');
const chartLiveId = getActiveLiveRecordId();
assert.ok(chartLiveId, 'chart-created live record becomes active');
assert.equal(getLiveRecordById(chartLiveId).anchor.price, 18366.5, 'chart price becomes live anchor');
assert.equal(getActiveReviewSetId(), activeSetupBefore, 'chart-created live record preserves active setup');

const liveDateGroups = getCalendarDayGroups('2024-03-18');
const liveGroup = liveDateGroups.find((group) => group.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD);
assert.ok(liveGroup, 'Live Records Calendar group exists');
assert.equal(liveGroup.rows.length, 1, 'Calendar group includes chart-created live record');
assert.equal(
  liveDateGroups.findIndex((group) => group.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD),
  liveDateGroups.findIndex((group) => group.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP) + 1,
  'Live Records group is directly after Order Setups'
);

const detailHtml = renderLiveRecordDetailPanel(getLiveRecordById(chartLiveId));
assert.match(detailHtml, /Live Record Detail/, 'detail renders title');
assert.match(detailHtml, /Display/, 'detail renders Display');
assert.match(detailHtml, /Summary/, 'detail renders Summary');
assert.match(detailHtml, /Anchor/, 'detail renders Anchor');
assert.match(detailHtml, /Execution/, 'detail renders Execution');
assert.match(detailHtml, /Reasons/, 'detail renders Reasons');
assert.match(detailHtml, /Result/, 'detail renders Result');

const calls = { refresh: 0, captures: 0, history: [] };
const actions = createLiveRecordActionController({
  refreshSelection: () => { calls.refresh += 1; },
  captureCalendarOpenGroups: () => { calls.captures += 1; },
  recordInspectorHistory: (label, mutator) => {
    calls.history.push(label);
    return mutator();
  },
});

assert.equal(actions.handleChange('live-record-summary', makeTarget(chartLiveId, { value: 'Action summary' })), true);
assert.equal(getLiveRecordById(chartLiveId).summary, 'Action summary', 'summary action updates');
assert.equal(actions.handleChange('live-record-display-field', makeTarget(chartLiveId, { liveRecordField: 'showRiskRewardBox', checked: false })), true);
assert.equal(getLiveRecordById(chartLiveId).display.showRiskRewardBox, false, 'display action updates');
assert.equal(actions.handleChange('live-record-result-status', makeTarget(chartLiveId, { value: 'win' })), true);
assert.equal(getLiveRecordById(chartLiveId).result.status, 'win', 'result action updates');
assert.equal(actions.handleClick('live-record-toggle-hidden', makeTarget(chartLiveId)), true);
assert.equal(getLiveRecordById(chartLiveId).display.hidden, true, 'hide action updates');
assert.equal(actions.handleClick('live-record-link-active-setup', makeTarget(chartLiveId)), true);
assert.equal(getLiveRecordById(chartLiveId).orderSetupId, setup.id, 'link active setup action updates live record');
assert.equal(actions.handleClick('live-record-unlink-setup', makeTarget(chartLiveId)), true);
assert.equal(getLiveRecordById(chartLiveId).orderSetupId, '', 'unlink action updates live record');
assert.equal(actions.handleClick('live-record-reason-add', makeTarget(chartLiveId)), true);
assert.equal(getLiveRecordById(chartLiveId).reasons.length, 2, 'add reason action updates');
assert.ok(calls.refresh > 0, 'actions refresh inspector');
assert.ok(calls.captures > 0, 'visibility/delete actions capture open groups');

recordHistory('Edit Live Record In History', () => updateLiveRecord(chartLiveId, { summary: 'History after' }, { now: 4 }));
assert.equal(getLiveRecordById(chartLiveId).summary, 'History after', 'history mutation applied');
assert.equal(undo(), true, 'undo live record edit');
assert.notEqual(getLiveRecordById(chartLiveId).summary, 'History after', 'undo restores live record');
assert.equal(redo(), true, 'redo live record edit');
assert.equal(getLiveRecordById(chartLiveId).summary, 'History after', 'redo restores live record');

assert.equal(actions.handleClick('live-record-delete', makeTarget(chartLiveId)), true);
assert.equal(getLiveRecordById(chartLiveId), null, 'delete action removes live record');
assert.ok(getOrderReviewById(setup.id), 'deleting live record does not delete setup');

console.log('live record smoke ok');
