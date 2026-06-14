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
  setActiveLiveRecord,
} from '../src/live-record/live-record-active.js';
import { createLiveRecordSet } from '../src/live-record/live-record-set.js';
import {
  cancelLiveRecord,
  closeLiveRecord,
  markLiveRecordReviewed,
  reopenLiveRecord,
  setLiveRecordLifecycleStatus,
} from '../src/live-record/live-record-lifecycle-actions.js';
import {
  canTransitionLiveRecordStatus,
  getLiveRecordAllowedNextStatuses,
  getLiveRecordDefaultChartStatus,
  getLiveRecordStatusLabel,
  isLiveRecordOpenStatus,
  isLiveRecordTerminalStatus,
  needsLiveRecordReview,
} from '../src/live-record/live-record-lifecycle.js';
import { hitTestLiveRecordElements } from '../src/live-record/live-record-hit-test.js';
import { getSelectedLiveRecordElement } from '../src/live-record/live-record-selection.js';
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
import { addSmtRecord, clearSmtRecords } from '../src/smt/smt-store.js';

const storageData = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageData.has(key) ? storageData.get(key) : null),
  setItem: (key, value) => storageData.set(key, String(value)),
  removeItem: (key) => storageData.delete(key),
};

function resetState() {
  clearOrderReviews();
  loadLiveRecords([]);
  clearSmtRecords();
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

assert.equal(getLiveRecordDefaultChartStatus(), 'active', 'chart-created live records default to active status');
assert.equal(getLiveRecordStatusLabel('submitted'), 'Submitted', 'status helper formats known status');
assert.equal(getLiveRecordStatusLabel('bad-status'), 'Draft', 'status helper falls back safely');
assert.equal(isLiveRecordOpenStatus('filled'), true, 'filled is still an open lifecycle status');
assert.equal(isLiveRecordTerminalStatus('closed'), true, 'closed is terminal');
assert.equal(isLiveRecordTerminalStatus('active'), false, 'active is not terminal');
assert.deepEqual(
  getLiveRecordAllowedNextStatuses('closed'),
  ['reviewed', 'active'],
  'closed records can be reviewed or reopened'
);
assert.equal(canTransitionLiveRecordStatus('active', 'closed'), true, 'active can transition to closed');
assert.equal(canTransitionLiveRecordStatus('reviewed', 'closed'), false, 'reviewed cannot transition back to closed directly');
assert.equal(needsLiveRecordReview({ status: 'closed' }), true, 'closed records need review');
assert.equal(needsLiveRecordReview({ status: 'reviewed' }), false, 'reviewed records do not need review');

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

const lifecycleRecord = addLiveRecord({
  id: 'live-lifecycle',
  instrument: 'NQ',
  status: 'draft',
}, { now: 4 });
assert.equal(markLiveRecordReviewed(lifecycleRecord.id, { emitStatus: false }), null, 'invalid lifecycle transition is rejected');
assert.ok(setLiveRecordLifecycleStatus(lifecycleRecord.id, 'active', { emitStatus: false }), 'draft record can become active');
assert.equal(setActiveLiveRecord(lifecycleRecord.id), true, 'lifecycle record can be active');
assert.ok(closeLiveRecord(lifecycleRecord.id, { emitStatus: false }), 'active record can close');
assert.equal(getLiveRecordById(lifecycleRecord.id).status, 'closed', 'close action stores closed status');
assert.equal(getActiveLiveRecordId(), null, 'terminal lifecycle status clears active live record');
assert.ok(reopenLiveRecord(lifecycleRecord.id, { emitStatus: false }), 'closed record can reopen');
assert.equal(getLiveRecordById(lifecycleRecord.id).status, 'active', 'reopen action stores active status');
assert.ok(cancelLiveRecord(lifecycleRecord.id, { emitStatus: false }), 'active record can cancel');
assert.equal(getLiveRecordById(lifecycleRecord.id).status, 'cancelled', 'cancel action stores cancelled status');
assert.ok(reopenLiveRecord(lifecycleRecord.id, { emitStatus: false }), 'cancelled record can reopen');
assert.ok(closeLiveRecord(lifecycleRecord.id, { emitStatus: false }), 'reopened record can close again');
assert.ok(markLiveRecordReviewed(lifecycleRecord.id, { emitStatus: false }), 'closed record can be marked reviewed');
assert.equal(getLiveRecordById(lifecycleRecord.id).status, 'reviewed', 'review action stores reviewed status');

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
    executionReviewNote: 'Managed exit cleanly',
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
assert.equal(richRecord.result.executionReviewNote, 'Managed exit cleanly', 'execution review note normalizes');
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
assert.equal(restoreLiveRecords('NQ'), 3, 'NQ restore loads instrument records');
assert.equal(getLiveRecordById('live-smoke').instrument, 'NQ', 'NQ record restored');
assert.equal(getLiveRecordById('live-rich-shape').execution.targets[0].role, 'targetExternal1', 'NQ rich record shape restored');
loadLiveRecords([]);
assert.equal(restoreLiveRecords('ES'), 1, 'ES restore loads one record');
assert.equal(getLiveRecordById('live-es').instrument, 'ES', 'ES record restored');
assert.equal(clearSavedLiveRecords('ES'), true, 'clear saved ES live records');

loadLiveRecords([]);
const inactiveMenuHtml = renderLiveRecordMenuItems({ bar: { timestamp: 1710770400 } });
assert.match(inactiveMenuHtml, /Create Bullish Live Record Here/, 'chart menu renders bullish live record entry');
assert.match(inactiveMenuHtml, /Create Bearish Live Record Here/, 'chart menu renders bearish live record entry');
assert.match(inactiveMenuHtml, /No active live record/, 'chart menu shows inactive label');
assert.match(inactiveMenuHtml, /Set Entry Here/, 'chart menu renders entry action shell');
assert.match(inactiveMenuHtml, /Set Target External 3 Here/, 'chart menu renders target action shell');
assert.ok(
  inactiveMenuHtml.indexOf('Create Bearish Live Record Here') < inactiveMenuHtml.indexOf('Set Entry Here'),
  'chart menu renders creation actions before write actions'
);
assert.ok(
  inactiveMenuHtml.indexOf('Set Result / Exit Here') < inactiveMenuHtml.indexOf('Link PDA To Active Live Record'),
  'chart menu renders evidence links after write actions'
);
const shiftMenuHtml = renderLiveRecordMenuItems({ bar: { timestamp: 1710770400 }, isShift: true });
assert.match(shiftMenuHtml, /Set Entry Here/, 'shift chart menu keeps write action shell');
assert.match(shiftMenuHtml, /Set All Ends Here/, 'shift chart menu renders end action shell');
assert.equal(handleLiveRecordChartAction('live-record-set-entry', {
  bar: { timestamp: 1710770400, close: 18366.25 },
  price: 18366.5,
  timeframe: '1H',
}), true, 'planned live record action is claimed by live record handler');
const activeSetupBefore = getActiveReviewSetId();
assert.equal(handleLiveRecordChartAction('live-record-create-bearish', {
  bar: { timestamp: 1710770400, close: 18366.25 },
  price: 18366.5,
  timeframe: '1H',
}), true, 'chart action handles bearish live record creation');
const chartLiveId = getActiveLiveRecordId();
assert.ok(chartLiveId, 'chart-created live record becomes active');
assert.equal(getLiveRecordById(chartLiveId).direction, 'short', 'bearish chart-created live record is short');
assert.equal(getLiveRecordById(chartLiveId).status, 'active', 'chart-created live record defaults to active status');
assert.equal(getLiveRecordById(chartLiveId).anchor.price, 18366.5, 'chart price becomes live anchor');
assert.equal(getActiveReviewSetId(), activeSetupBefore, 'chart-created live record preserves active setup');
assert.match(renderLiveRecordMenuItems({ bar: { timestamp: 1710770400 } }), /Close Active Live Record/, 'chart menu renders active close action');
assert.equal(handleLiveRecordChartAction('live-record-set-entry', {
  bar: { timestamp: 1710770460, close: 18361 },
  price: 18361.25,
  timeframe: '5M',
}), true, 'chart action writes entry');
assert.equal(handleLiveRecordChartAction('live-record-set-stop-loss', {
  bar: { timestamp: 1710770520, close: 18372 },
  price: 18372.5,
  timeframe: '5M',
}), true, 'chart action writes stop loss');
assert.equal(handleLiveRecordChartAction('live-record-set-target-external-1', {
  bar: { timestamp: 1710770580, close: 18325 },
  price: 18325.5,
  timeframe: '5M',
}), true, 'chart action writes target');
assert.equal(handleLiveRecordChartAction('live-record-set-result-exit', {
  bar: { timestamp: 1710770640, close: 18330 },
  price: 18330.25,
  timeframe: '1M',
}), true, 'chart action writes result exit');
assert.equal(handleLiveRecordChartAction('live-record-set-all-ends', {
  bar: { timestamp: 1710770700, close: 18331 },
  price: 18331,
  timeframe: '1M',
}), true, 'chart action writes execution ends');
const chartRecordAfterWrites = getLiveRecordById(chartLiveId);
assert.equal(chartRecordAfterWrites.execution.entry.price, 18361.25, 'entry price stored from chart');
assert.equal(chartRecordAfterWrites.execution.entry.endTimestamp, 1710770700, 'entry end stored from chart');
assert.equal(chartRecordAfterWrites.execution.stopLoss.price, 18372.5, 'stop loss price stored from chart');
assert.equal(chartRecordAfterWrites.execution.targets[0].role, 'targetExternal1', 'target role stored from chart');
assert.equal(chartRecordAfterWrites.execution.targets[0].endTimestamp, 1710770700, 'target end stored from chart');
assert.equal(chartRecordAfterWrites.result.exitTimeframe, '1M', 'result timeframe stored from chart');
assert.equal(chartRecordAfterWrites.result.exitPrice, 18330.25, 'result price stored from chart');
assert.equal(getOrderReviewById(setup.id).setupThesis.primaryEventTimestamp, 1710770400, 'live chart writes do not mutate setup thesis');
assert.match(renderLiveRecordMenuItems({
  bar: { timestamp: 1710770400 },
  pdaHit: { id: 'pda-live-link', type: 'fvg' },
  segmentHit: { id: 'segment-live-link' },
  segmentGroupHit: { id: 'composite-live-link' },
  chartNote: { id: 'chart-note-live-link', kind: 'bar', timeframe: '5M' },
}), /Link Chart Note To Active Live Record/, 'chart menu renders evidence link actions');
assert.equal(handleLiveRecordChartAction('live-record-link-pda', {
  pdaHit: { id: 'pda-live-link', type: 'fvg' },
}), true, 'chart action links PDA evidence');
assert.equal(handleLiveRecordChartAction('live-record-link-pda', {
  pdaHit: { id: 'pda-live-link', type: 'fvg' },
}), true, 'duplicate PDA evidence link is accepted');
assert.equal(handleLiveRecordChartAction('live-record-link-segment', {
  segmentHit: { id: 'segment-live-link' },
}), true, 'chart action links segment evidence');
assert.equal(handleLiveRecordChartAction('live-record-link-composite', {
  segmentGroupHit: { id: 'composite-live-link' },
}), true, 'chart action links composite evidence');
addSmtRecord({
  id: 'smt-live-link',
  type: 'fvg',
  direction: 'bearish',
  timestamp: 1710770600,
  fvgStartTimestamp: 1710770580,
  fvgEndTimestamp: 1710770640,
  fvgTop: 18350,
  fvgBottom: 18340,
});
assert.equal(handleLiveRecordChartAction('live-record-link-latest-smt'), true, 'chart action links latest SMT evidence');
assert.equal(handleLiveRecordChartAction('live-record-link-chart-note', {
  chartNote: { id: 'chart-note-live-link', kind: 'bar', timeframe: '5M' },
}), true, 'chart action links chart note evidence');
const chartRecordAfterLinks = getLiveRecordById(chartLiveId);
assert.equal(chartRecordAfterLinks.reasons[0].refs.length, 5, 'evidence links are de-duped in first reason refs');
assert.equal(chartRecordAfterLinks.linkedObjectRefs.length, 5, 'evidence links are de-duped in linked refs');
assert.equal(chartRecordAfterLinks.reasons[0].refs.filter((ref) => ref.type === 'pda').length, 1, 'duplicate PDA ref is de-duped');
assert.equal(getOrderReviewById(setup.id).setupThesis.reasons?.[0]?.refs?.length || 0, 0, 'live evidence links do not mutate setup refs');
const liveHit = hitTestLiveRecordElements({
  x: 110,
  y: 250,
  context: {
    timeframe: 5,
    getDisplayBars: () => [{ timestamp: 1710770400, high: 18365, low: 18355 }],
    timeToCoordinate: (time) => (Number(time) === 1710770400 ? 100 : null),
    priceToCoordinate: (value) => (Number(value) === 18361.25 ? 250 : null),
  },
}).primaryHit;
assert.equal(liveHit?.liveRecordId, chartLiveId, 'hit-test returns live record id');
assert.equal(liveHit?.element, 'entry', 'hit-test returns live record element');

const hitRecord = addLiveRecord({
  id: 'live-hit-actions',
  instrument: 'NQ',
  anchor: { timestamp: 1710770400, timeframe: '1H', price: 18366.36 },
  execution: {
    entry: { timestamp: 1710770460, timeframe: '1M', price: 18361.25 },
    targets: [{ role: 'targetExternal1', timestamp: 1710770580, timeframe: '5M', price: 18325.5 }],
  },
}, { now: 7 });
assert.equal(handleLiveRecordChartAction('live-record-hit-set-active', {
  liveRecordId: hitRecord.id,
}), true, 'hit action sets active live record');
assert.equal(getActiveLiveRecordId(), hitRecord.id, 'hit set active changes active live record');
assert.equal(handleLiveRecordChartAction('live-record-hit-select-element', {
  liveRecordId: hitRecord.id,
  liveRecordElement: 'entry',
}), true, 'hit action selects live record element');
assert.equal(getSelectedLiveRecordElement()?.element, 'entry', 'selected live record element is stored');
assert.equal(handleLiveRecordChartAction('live-record-hit-hide-element', {
  liveRecordId: hitRecord.id,
  liveRecordElement: 'entry',
}), true, 'hit action hides live record element');
assert.equal(getLiveRecordById(hitRecord.id).display.elementVisibility.entry, false, 'hit hide stores element visibility');
assert.equal(handleLiveRecordChartAction('live-record-hit-delete-element', {
  liveRecordId: hitRecord.id,
  liveRecordElement: 'targetExternal1',
}), true, 'hit action deletes live record element');
assert.equal(getLiveRecordById(hitRecord.id).execution.targets.length, 0, 'hit delete removes only selected target');
assert.equal(handleLiveRecordChartAction('live-record-hit-delete-record', {
  liveRecordId: hitRecord.id,
}), true, 'hit action deletes live record');
assert.equal(getLiveRecordById(hitRecord.id), null, 'hit delete record removes only live record');
assert.equal(handleLiveRecordChartAction('live-record-hit-select-element', {
  liveRecordId: chartLiveId,
  liveRecordElement: 'entry',
}), true, 'chart-created live record entry can be selected');
assert.equal(handleLiveRecordChartAction('live-record-hit-hide-element', {
  liveRecordId: chartLiveId,
  liveRecordElement: 'entry',
}), true, 'chart-created live record entry can be hidden');

const liveDateGroups = getCalendarDayGroups('2024-03-18');
const liveGroup = liveDateGroups.find((group) => group.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD);
assert.ok(liveGroup, 'Live Records Calendar group exists');
assert.equal(liveGroup.rows.length, 1, 'Calendar group includes chart-created live record');
assert.match(liveGroup.rows[0].label, /Exit/, 'Calendar live record summary includes exit');
assert.doesNotMatch(liveGroup.rows[0].label, /Draft|Unknown/, 'Calendar live record summary omits default status noise');
assert.equal(
  liveDateGroups.findIndex((group) => group.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD),
  liveDateGroups.findIndex((group) => group.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP) + 1,
  'Live Records group is directly after Order Setups'
);

const detailHtml = renderLiveRecordDetailPanel(getLiveRecordById(chartLiveId));
assert.match(detailHtml, /Live Record Detail/, 'detail renders title');
assert.match(detailHtml, /Active/, 'detail header renders lifecycle status');
assert.match(detailHtml, /Close/, 'detail header renders lifecycle transition action');
assert.match(detailHtml, /Mark Reviewed/, 'detail header renders review lifecycle action');
assert.match(detailHtml, /Display/, 'detail renders Display');
assert.match(detailHtml, /Summary/, 'detail renders Summary');
assert.match(detailHtml, /Anchor/, 'detail renders Anchor');
assert.match(detailHtml, /Short/, 'detail uses Order Setup direction vocabulary');
assert.doesNotMatch(detailHtml, /Bearish/, 'detail does not mix bullish/bearish direction vocabulary');
assert.match(detailHtml, /Execution/, 'detail renders Execution');
assert.match(detailHtml, /Hidden/, 'detail renders hidden execution state');
assert.doesNotMatch(detailHtml, /Hidden · Selected/, 'hidden element selection is cleared after hide');
assert.match(detailHtml, /External · 5M/, 'detail title-cases target execution metadata');
assert.match(detailHtml, /End: /, 'detail renders normalized execution end metadata');
assert.match(detailHtml, /Reasons/, 'detail renders Reasons');
assert.match(detailHtml, /Chart Note/, 'detail renders linked chart note ref');
assert.match(detailHtml, /Context · PDA · fvg · pda-live-link/, 'detail renders formatted PDA ref source');
assert.match(detailHtml, /Context · Chart Note · bar · chart-note-live-link/, 'detail renders formatted chart note ref source');
assert.match(detailHtml, /Result/, 'detail renders Result');
assert.match(detailHtml, /Execution Review/, 'detail renders execution review field');
assert.match(detailHtml, /Reviewed/, 'detail renders reviewed toggle');

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
assert.equal(actions.handleChange('live-record-result-execution-review', makeTarget(chartLiveId, { value: 'Execution was disciplined' })), true);
assert.equal(getLiveRecordById(chartLiveId).result.executionReviewNote, 'Execution was disciplined', 'execution review action updates');
assert.equal(actions.handleClick('live-record-status', makeTarget(chartLiveId, { liveRecordStatus: 'closed' })), true);
assert.equal(getLiveRecordById(chartLiveId).status, 'closed', 'status action updates lifecycle status');
assert.equal(actions.handleClick('live-record-status', makeTarget(chartLiveId, { liveRecordStatus: 'reviewed' })), true);
assert.equal(getLiveRecordById(chartLiveId).status, 'reviewed', 'status action can mark reviewed');
assert.equal(actions.handleChange('live-record-reviewed-toggle', makeTarget(chartLiveId, { checked: false })), true);
assert.equal(getLiveRecordById(chartLiveId).status, 'active', 'reviewed toggle can reopen reviewed record');
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
