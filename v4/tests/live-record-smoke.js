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
import { createLiveRecordSet } from '../src/live-record/live-record-set.js';
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

const richRecord = addLiveRecord({
  id: 'live-rich-shape',
  instrument: 'NQ',
  execution: {
    entry: {
      timestamp: 1710770410,
      timeframe: '5m',
      price: '18360.5',
      endTimestamp: 1710770710,
      endTimeframe: '5m',
      lineLengthBars: '12',
    },
    marketStructureShift: {
      timestamp: 1710770430,
      timeframe: '1m',
      price: '18358.25',
    },
    stopLoss: {
      price: '18370.75',
      visible: false,
    },
    targets: [{
      role: 'targetExternal1',
      timestamp: 1710770490,
      timeframe: '5m',
      price: '18320.25',
      endTimestamp: 1710770790,
    }],
  },
  result: {
    status: 'profit',
    exitTimestamp: 1710770800,
    exitTimeframe: '1m',
    exitPrice: '18322.5',
  },
}, { now: 5 });
assert.equal(richRecord.execution.entry.timeframe, '5M', 'entry timeframe normalizes');
assert.equal(richRecord.execution.entry.endTimeframe, '5M', 'entry end timeframe normalizes');
assert.equal(richRecord.execution.marketStructureShift.timeframe, '1M', 'MSS timeframe normalizes');
assert.equal(richRecord.execution.stopLoss.visible, false, 'element visibility normalizes');
assert.equal(richRecord.execution.targets[0].label, 'Target External 1', 'target role gets setup-like label');
assert.equal(richRecord.execution.targets[0].targetType, 'external', 'target type derives from role');
assert.equal(richRecord.result.status, 'win', 'result alias still normalizes');
assert.equal(richRecord.result.exitTimeframe, '1M', 'result exit timeframe normalizes');
richRecord.execution.entry.price = 1;
assert.equal(getLiveRecordById('live-rich-shape').execution.entry.price, 18360.5, 'execution clone is isolated');

updateLiveRecord('live-rich-shape', {
  execution: {
    entry: { price: 18361 },
  },
}, { now: 6 });
assert.equal(getLiveRecordById('live-rich-shape').execution.entry.timestamp, 1710770410, 'partial execution patch preserves entry timestamp');
assert.equal(getLiveRecordById('live-rich-shape').execution.entry.price, 18361, 'partial execution patch updates entry price');

const richSet = createLiveRecordSet(getLiveRecordById('live-rich-shape'));
assert.equal(richSet.execution.entry.endTimestamp, 1710770710, 'projection keeps entry end timestamp');
assert.equal(richSet.execution.marketStructureShift.complete, true, 'projection includes MSS element');
assert.equal(richSet.execution.targets[0].role, 'targetExternal1', 'projection keeps target role');
assert.equal(richSet.result.exitTimeframe, '1M', 'projection keeps result exit timeframe');

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
assert.equal(restoreLiveRecords('NQ'), 2, 'NQ restore loads instrument records');
assert.equal(getLiveRecordById('live-smoke').instrument, 'NQ', 'NQ record restored');
assert.equal(getLiveRecordById('live-rich-shape').execution.targets[0].role, 'targetExternal1', 'NQ rich record shape restored');
loadLiveRecords([]);
assert.equal(restoreLiveRecords('ES'), 1, 'ES restore loads one record');
assert.equal(getLiveRecordById('live-es').instrument, 'ES', 'ES record restored');
assert.equal(clearSavedLiveRecords('ES'), true, 'clear saved ES live records');

loadLiveRecords([]);
const inactiveMenuHtml = renderLiveRecordMenuItems({ bar: { timestamp: 1710770400 } });
assert.match(inactiveMenuHtml, /New Live Record Here/, 'chart menu renders live record entry');
assert.match(inactiveMenuHtml, /No active live record/, 'chart menu shows inactive label');
assert.match(inactiveMenuHtml, /Set Entry Here/, 'chart menu renders entry action shell');
assert.match(inactiveMenuHtml, /Set Target External 3 Here/, 'chart menu renders target action shell');
assert.match(renderLiveRecordMenuItems({ bar: { timestamp: 1710770400 }, isShift: true }), /Set All Ends Here/, 'shift chart menu renders end action shell');
assert.equal(handleLiveRecordChartAction('live-record-set-entry', {
  bar: { timestamp: 1710770400, close: 18366.25 },
  price: 18366.5,
  timeframe: '1H',
}), true, 'planned live record action is claimed by live record handler');
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
assert.match(renderLiveRecordMenuItems({ bar: { timestamp: 1710770400 } }), /Close Active Live Record/, 'chart menu renders active close action');

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
