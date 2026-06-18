import * as bus from '../event-bus.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { recordHistory } from '../history/history-manager.js';
import { clearActiveReviewSet } from '../order/order-review-active.js';
import { getSmtRecords } from '../smt/smt-store.js';
import {
  clearActiveLiveRecord,
  createLiveRecordFromAnchor,
  getActiveLiveRecord,
  setActiveLiveRecord,
  patchActiveLiveRecord,
} from './live-record-active.js';
import {
  deleteLiveRecord,
  getLiveRecordById,
  updateLiveRecord,
} from './live-record-store.js';
import {
  getLiveRecordAllowedNextStatuses,
  getLiveRecordStatusLabel,
} from './live-record-lifecycle.js';
import { setLiveRecordLifecycleStatus } from './live-record-lifecycle-actions.js';
import {
  clearLiveRecordElementSelection,
  selectLiveRecordElement,
} from './live-record-selection.js';
import {
  LIVE_RECORD_DIRECTIONS,
  LIVE_RECORD_REASON_CATEGORIES,
  LIVE_RECORD_REF_ROLES,
  LIVE_RECORD_REF_TYPES,
  LIVE_RECORD_STATUSES,
  LIVE_RECORD_TARGET_ROLES,
  LIVE_RECORD_TARGET_TYPES,
} from './live-record-types.js';

export const LIVE_RECORD_CHART_ACTIONS = Object.freeze({
  NEW_HERE: 'live-record-new-here',
  CREATE_BULLISH: 'live-record-create-bullish',
  CREATE_BEARISH: 'live-record-create-bearish',
  CLEAR_ACTIVE: 'live-record-clear-active',
  MOVE_ANCHOR: 'live-record-move-anchor',
  SET_ENTRY: 'live-record-set-entry',
  SET_ENTRY_END: 'live-record-set-entry-end',
  SET_MARKET_STRUCTURE_SHIFT: 'live-record-set-market-structure-shift',
  SET_MARKET_STRUCTURE_SHIFT_END: 'live-record-set-market-structure-shift-end',
  SET_STOP_LOSS: 'live-record-set-stop-loss',
  SET_STOP_LOSS_END: 'live-record-set-stop-loss-end',
  SET_TARGET_INTERNAL_1: 'live-record-set-target-internal-1',
  SET_TARGET_INTERNAL_1_END: 'live-record-set-target-internal-1-end',
  SET_TARGET_INTERNAL_2: 'live-record-set-target-internal-2',
  SET_TARGET_INTERNAL_2_END: 'live-record-set-target-internal-2-end',
  SET_TARGET_INTERNAL_3: 'live-record-set-target-internal-3',
  SET_TARGET_INTERNAL_3_END: 'live-record-set-target-internal-3-end',
  SET_TARGET_SWING_POINT: 'live-record-set-target-swing-point',
  SET_TARGET_SWING_POINT_END: 'live-record-set-target-swing-point-end',
  SET_TARGET_EXTERNAL_1: 'live-record-set-target-external-1',
  SET_TARGET_EXTERNAL_1_END: 'live-record-set-target-external-1-end',
  SET_TARGET_EXTERNAL_2: 'live-record-set-target-external-2',
  SET_TARGET_EXTERNAL_2_END: 'live-record-set-target-external-2-end',
  SET_FINAL_TARGET: 'live-record-set-final-target',
  SET_FINAL_TARGET_END: 'live-record-set-final-target-end',
  SET_RESULT_EXIT: 'live-record-set-result-exit',
  SET_ALL_ENDS: 'live-record-set-all-ends',
  LINK_PDA: 'live-record-link-pda',
  LINK_SEGMENT: 'live-record-link-segment',
  LINK_COMPOSITE: 'live-record-link-composite',
  LINK_LATEST_SMT: 'live-record-link-latest-smt',
  LINK_CHART_NOTE: 'live-record-link-chart-note',
  HIT_SET_ACTIVE: 'live-record-hit-set-active',
  HIT_SELECT_ELEMENT: 'live-record-hit-select-element',
  HIT_HIDE_ELEMENT: 'live-record-hit-hide-element',
  HIT_DELETE_ELEMENT: 'live-record-hit-delete-element',
  HIT_DELETE_RECORD: 'live-record-hit-delete-record',
  SET_STATUS_PLANNED: 'live-record-status-planned',
  SET_STATUS_ACTIVE: 'live-record-status-active',
  SET_STATUS_SUBMITTED: 'live-record-status-submitted',
  SET_STATUS_FILLED: 'live-record-status-filled',
  SET_STATUS_CANCELLED: 'live-record-status-cancelled',
  SET_STATUS_CLOSED: 'live-record-status-closed',
  SET_STATUS_REVIEWED: 'live-record-status-reviewed',
});

const LIVE_RECORD_STATUS_ACTIONS = Object.freeze({
  [LIVE_RECORD_CHART_ACTIONS.SET_STATUS_PLANNED]: LIVE_RECORD_STATUSES.PLANNED,
  [LIVE_RECORD_CHART_ACTIONS.SET_STATUS_ACTIVE]: LIVE_RECORD_STATUSES.ACTIVE,
  [LIVE_RECORD_CHART_ACTIONS.SET_STATUS_SUBMITTED]: LIVE_RECORD_STATUSES.SUBMITTED,
  [LIVE_RECORD_CHART_ACTIONS.SET_STATUS_FILLED]: LIVE_RECORD_STATUSES.FILLED,
  [LIVE_RECORD_CHART_ACTIONS.SET_STATUS_CANCELLED]: LIVE_RECORD_STATUSES.CANCELLED,
  [LIVE_RECORD_CHART_ACTIONS.SET_STATUS_CLOSED]: LIVE_RECORD_STATUSES.CLOSED,
  [LIVE_RECORD_CHART_ACTIONS.SET_STATUS_REVIEWED]: LIVE_RECORD_STATUSES.REVIEWED,
});

const LIVE_RECORD_TARGET_MENU_ITEMS = Object.freeze([
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_1, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_1_END, 'Target Internal 1'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_2, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_2_END, 'Target Internal 2'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_3, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_3_END, 'Target Internal 3'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_SWING_POINT, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_SWING_POINT_END, 'Target Swing Point'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_1, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_1_END, 'Target External 1'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_2, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_2_END, 'Target External 2'],
  [LIVE_RECORD_CHART_ACTIONS.SET_FINAL_TARGET, LIVE_RECORD_CHART_ACTIONS.SET_FINAL_TARGET_END, 'Target External 3'],
]);

const LIVE_RECORD_TARGET_ACTIONS = Object.freeze({
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_1]: {
    role: LIVE_RECORD_TARGET_ROLES.INTERNAL_1,
    targetType: LIVE_RECORD_TARGET_TYPES.INTERNAL,
    label: 'Target Internal 1',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_2]: {
    role: LIVE_RECORD_TARGET_ROLES.INTERNAL_2,
    targetType: LIVE_RECORD_TARGET_TYPES.INTERNAL,
    label: 'Target Internal 2',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_3]: {
    role: LIVE_RECORD_TARGET_ROLES.INTERNAL_3,
    targetType: LIVE_RECORD_TARGET_TYPES.INTERNAL,
    label: 'Target Internal 3',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_SWING_POINT]: {
    role: LIVE_RECORD_TARGET_ROLES.SWING_POINT,
    targetType: LIVE_RECORD_TARGET_TYPES.SWING,
    label: 'Target Swing Point',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_1]: {
    role: LIVE_RECORD_TARGET_ROLES.EXTERNAL_1,
    targetType: LIVE_RECORD_TARGET_TYPES.EXTERNAL,
    label: 'Target External 1',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_2]: {
    role: LIVE_RECORD_TARGET_ROLES.EXTERNAL_2,
    targetType: LIVE_RECORD_TARGET_TYPES.EXTERNAL,
    label: 'Target External 2',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_FINAL_TARGET]: {
    role: LIVE_RECORD_TARGET_ROLES.FINAL,
    targetType: LIVE_RECORD_TARGET_TYPES.FINAL,
    label: 'Target External 3',
  },
});

const LIVE_RECORD_TARGET_END_ACTIONS = Object.freeze({
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_1_END]: LIVE_RECORD_TARGET_ROLES.INTERNAL_1,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_2_END]: LIVE_RECORD_TARGET_ROLES.INTERNAL_2,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_3_END]: LIVE_RECORD_TARGET_ROLES.INTERNAL_3,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_SWING_POINT_END]: LIVE_RECORD_TARGET_ROLES.SWING_POINT,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_1_END]: LIVE_RECORD_TARGET_ROLES.EXTERNAL_1,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_2_END]: LIVE_RECORD_TARGET_ROLES.EXTERNAL_2,
  [LIVE_RECORD_CHART_ACTIONS.SET_FINAL_TARGET_END]: LIVE_RECORD_TARGET_ROLES.FINAL,
});

const LIVE_RECORD_LINK_ACTIONS = Object.freeze({
  [LIVE_RECORD_CHART_ACTIONS.LINK_PDA]: {
    getTarget: (context) => context.pdaHit?.id ? context.pdaHit : null,
    buildRef: (hit) => ({
      type: LIVE_RECORD_REF_TYPES.PDA,
      id: hit.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      sourceContext: hit.type || '',
    }),
    label: () => 'PDA linked to active Live Record',
  },
  [LIVE_RECORD_CHART_ACTIONS.LINK_SEGMENT]: {
    getTarget: (context) => context.segmentHit?.id ? context.segmentHit : null,
    buildRef: (hit) => ({
      type: LIVE_RECORD_REF_TYPES.SEGMENT,
      id: hit.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      sourceContext: hit.type || hit.kind || '',
    }),
    label: () => 'Segment linked to active Live Record',
  },
  [LIVE_RECORD_CHART_ACTIONS.LINK_COMPOSITE]: {
    getTarget: (context) => context.segmentGroupHit?.id ? context.segmentGroupHit : null,
    buildRef: (hit) => ({
      type: LIVE_RECORD_REF_TYPES.COMPOSITE,
      id: hit.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
    }),
    label: () => 'Composite linked to active Live Record',
  },
  [LIVE_RECORD_CHART_ACTIONS.LINK_LATEST_SMT]: {
    getTarget: () => getSmtRecords().filter((record) => record.primaryInstrument === getPrimaryInstrument()).at(-1) || null,
    buildRef: (smt) => ({
      type: LIVE_RECORD_REF_TYPES.SMT,
      id: smt.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      sourceContext: smt.type || '',
    }),
    label: () => 'Latest SMT linked to active Live Record',
  },
  [LIVE_RECORD_CHART_ACTIONS.LINK_CHART_NOTE]: {
    getTarget: (context) => context.chartNote?.id ? context.chartNote : null,
    buildRef: (note) => ({
      type: LIVE_RECORD_REF_TYPES.CHART_NOTE,
      id: note.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      sourceTimeframeLabel: note.timeframe ? String(note.timeframe) : '',
      sourceContext: note.kind || '',
    }),
    label: () => 'Chart Note linked to active Live Record',
  },
});

function getAnchorPrice(bar = {}, fallbackPrice = null) {
  const price = Number(fallbackPrice);
  if (Number.isFinite(price)) return price;
  const close = Number(bar.close);
  return Number.isFinite(close) ? close : null;
}

function getChartAnchor({ bar = null, price = null, timeframe = '' } = {}) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return null;
  return {
    timestamp: Number(bar.timestamp),
    timeframe,
    price: getAnchorPrice(bar, price),
  };
}

function getChartEnd({ bar = null, timeframe = '' } = {}) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return null;
  return {
    endTimestamp: Number(bar.timestamp),
    endTimeframe: timeframe,
  };
}

function hasElementValue(element = {}) {
  return (element.timestamp !== null && element.timestamp !== undefined)
    || (element.price !== null && element.price !== undefined);
}

function upsertTarget(targets = [], targetPatch = {}) {
  const role = targetPatch.role || targetPatch.id;
  const nextTarget = {
    id: role,
    ...targetPatch,
  };
  const existingTargets = Array.isArray(targets) ? targets : [];
  const index = existingTargets.findIndex((target) => target.role === role || target.id === role);
  if (index < 0) return [...existingTargets, nextTarget];
  return [
    ...existingTargets.slice(0, index),
    {
      ...existingTargets[index],
      ...nextTarget,
    },
    ...existingTargets.slice(index + 1),
  ];
}

function setTargetEnd(targets = [], role = '', end = {}) {
  const existingTargets = Array.isArray(targets) ? targets : [];
  let changed = false;
  const nextTargets = existingTargets.map((target) => {
    if (target.role !== role && target.id !== role) return target;
    changed = true;
    return { ...target, ...end };
  });
  return changed ? nextTargets : null;
}

function setAllElementEnds(execution = {}, end = {}) {
  const targets = Array.isArray(execution.targets) ? execution.targets : [];
  return {
    entry: hasElementValue(execution.entry) ? { ...(execution.entry || {}), ...end } : execution.entry,
    marketStructureShift: hasElementValue(execution.marketStructureShift)
      ? { ...(execution.marketStructureShift || {}), ...end }
      : execution.marketStructureShift,
    stopLoss: hasElementValue(execution.stopLoss) ? { ...(execution.stopLoss || {}), ...end } : execution.stopLoss,
    targets: targets.map((target) => (hasElementValue(target) ? { ...target, ...end } : target)),
  };
}

function refsEqual(left = {}, right = {}) {
  return left.type === right.type
    && left.id === right.id
    && left.role === right.role;
}

function appendUniqueRef(refs = [], ref = {}) {
  const existing = Array.isArray(refs) ? refs : [];
  return existing.some((item) => refsEqual(item, ref)) ? existing : [...existing, ref];
}

function buildLiveRecordRefPatch(active = {}, ref = {}) {
  const reasons = Array.isArray(active.reasons) && active.reasons.length
    ? active.reasons
    : [{ id: 'reason_1', category: LIVE_RECORD_REASON_CATEGORIES.OTHER, note: '', refs: [] }];
  const firstReason = reasons[0] || {};
  return {
    reasons: [
      {
        ...firstReason,
        refs: appendUniqueRef(firstReason.refs, ref),
      },
      ...reasons.slice(1),
    ],
    linkedObjectRefs: appendUniqueRef(active.linkedObjectRefs, ref),
  };
}

function patchActiveFromChart(label, patchFactory, context = {}) {
  const active = getActiveLiveRecord();
  if (!active) {
    bus.emit('status:update', { text: 'No active Live Record', isError: true });
    return true;
  }
  if (!context.bar || !Number.isFinite(Number(context.bar.timestamp))) {
    bus.emit('status:update', { text: 'Cannot update Live Record: no chart bar selected', isError: true });
    return true;
  }
  const patch = patchFactory(active);
  if (!patch) {
    bus.emit('status:update', { text: `${label} failed`, isError: true });
    return true;
  }
  const updated = recordHistory(label, () => patchActiveLiveRecord(patch));
  bus.emit('status:update', {
    text: updated?.id ? `${label}: ${updated.id}` : `${label} failed`,
    isError: !updated?.id,
  });
  return true;
}

function linkContextObjectToActiveLiveRecord(action, context = {}) {
  const active = getActiveLiveRecord();
  if (!active) {
    bus.emit('status:update', { text: 'No active Live Record', isError: true });
    return true;
  }
  const actionConfig = LIVE_RECORD_LINK_ACTIONS[action];
  if (!actionConfig) return false;
  const target = actionConfig.getTarget(context);
  if (!target) {
    bus.emit('status:update', { text: 'No context object to link to active Live Record', isError: true });
    return true;
  }
  const ref = actionConfig.buildRef(target);
  const updated = recordHistory('Link Evidence To Live Record', () =>
    patchActiveLiveRecord(buildLiveRecordRefPatch(active, ref))
  );
  bus.emit('status:update', {
    text: updated?.id ? actionConfig.label(target) : 'Live Record evidence link failed',
    isError: !updated?.id,
  });
  return true;
}

function renderEvidenceLinkRows({ active, pdaHit, segmentHit, segmentGroupHit, chartNote } = {}) {
  const activeDisabled = active ? '' : 'disabled';
  const pdaDisabled = active && pdaHit ? '' : 'disabled';
  const segmentDisabled = active && segmentHit ? '' : 'disabled';
  const compositeDisabled = active && segmentGroupHit ? '' : 'disabled';
  const smtDisabled = active && getSmtRecords().filter((record) => record.primaryInstrument === getPrimaryInstrument()).length ? '' : 'disabled';
  const chartNoteDisabled = active && chartNote ? '' : 'disabled';
  return `
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_PDA}" ${activeDisabled || pdaDisabled}>Link PDA To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_SEGMENT}" ${activeDisabled || segmentDisabled}>Link Segment To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_COMPOSITE}" ${activeDisabled || compositeDisabled}>Link Composite To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_LATEST_SMT}" ${activeDisabled || smtDisabled}>Link Latest SMT To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_CHART_NOTE}" ${activeDisabled || chartNoteDisabled}>Link Chart Note To Active Live Record</button>
  `;
}

function getActiveLiveRecordLabel() {
  const active = getActiveLiveRecord();
  if (!active) return 'No active live record';
  const direction = active.direction === LIVE_RECORD_DIRECTIONS.LONG
    ? 'Long'
    : active.direction === LIVE_RECORD_DIRECTIONS.SHORT
      ? 'Short'
      : 'Unknown';
  return `${direction} · ${active.id.slice(0, 18)}`;
}

function getStatusActionLabel(status) {
  if (status === LIVE_RECORD_STATUSES.ACTIVE) return 'Reopen';
  if (status === LIVE_RECORD_STATUSES.CANCELLED) return 'Cancel';
  if (status === LIVE_RECORD_STATUSES.CLOSED) return 'Close';
  if (status === LIVE_RECORD_STATUSES.REVIEWED) return 'Mark Reviewed';
  return getLiveRecordStatusLabel(status);
}

function getStatusActionForStatus(status) {
  return Object.entries(LIVE_RECORD_STATUS_ACTIONS)
    .find(([, actionStatus]) => actionStatus === status)?.[0] || '';
}

function renderLiveRecordStatusRows(record = {}, extraAttrs = '') {
  if (!record) return '';
  const statuses = getLiveRecordAllowedNextStatuses(record.status);
  if (!record?.id || !statuses.length) return '';
  return statuses.map((status) => {
    const action = getStatusActionForStatus(status);
    if (!action) return '';
    return `<button class="pda-menu-item" data-pda-action="${action}" data-live-record-id="${record.id}" ${extraAttrs}>${getStatusActionLabel(status)}</button>`;
  }).join('');
}

function getLiveRecordElementLabel(role) {
  if (role === 'anchor') return 'Anchor';
  if (role === 'entry') return 'Entry';
  if (role === 'marketStructureShift') return 'MSS';
  if (role === 'stopLoss') return 'Stop Loss';
  if (role === 'targetInternal1') return 'Target Internal 1';
  if (role === 'targetInternal2') return 'Target Internal 2';
  if (role === 'targetInternal3') return 'Target Internal 3';
  if (role === 'targetSwingPoint') return 'Target Swing Point';
  if (role === 'targetExternal1') return 'Target External 1';
  if (role === 'targetExternal2') return 'Target External 2';
  if (role === 'finalTarget') return 'Target External 3';
  if (role === 'result') return 'Result';
  return role || 'Element';
}

function formatHitTimestamp(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return '';
  const date = new Date(Number(timestamp) * 1000);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getLiveRecordHitLabel(liveRecordId, hit = {}) {
  const record = getLiveRecordById(liveRecordId);
  if (!record) return liveRecordId.slice(0, 18);
  const direction = record?.direction === LIVE_RECORD_DIRECTIONS.LONG
    ? 'Long'
    : record?.direction === LIVE_RECORD_DIRECTIONS.SHORT
      ? 'Short'
      : 'Live';
  const timestamp = formatHitTimestamp(record?.anchor?.timestamp || hit.timestamp);
  const suffix = timestamp ? `${direction} ${timestamp}` : liveRecordId.slice(0, 18);
  return suffix;
}

function getHitLiveRecordMenuItems(liveRecordHit) {
  const hit = liveRecordHit?.primaryHit || (Array.isArray(liveRecordHit?.hits) ? liveRecordHit.hits[0] : null);
  if (!hit?.liveRecordId) return '';
  const liveRecordId = hit.liveRecordId;
  const record = getLiveRecordById(liveRecordId);
  const recordLabel = getLiveRecordHitLabel(liveRecordId, hit);
  const elementLabel = `${getLiveRecordElementLabel(hit.element)} · ${recordLabel}`;
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Live Record Element</div>
      <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.HIT_SET_ACTIVE}" data-live-record-id="${liveRecordId}">Set Active · ${recordLabel}</button>
        ${renderLiveRecordStatusRows(record)}
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.HIT_DELETE_RECORD}" data-live-record-id="${liveRecordId}">Delete Live Record</button>
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.HIT_SELECT_ELEMENT}" data-live-record-id="${liveRecordId}" data-live-record-element="${hit.element}">Select ${elementLabel}</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.HIT_HIDE_ELEMENT}" data-live-record-id="${liveRecordId}" data-live-record-element="${hit.element}">Hide ${elementLabel}</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.HIT_DELETE_ELEMENT}" data-live-record-id="${liveRecordId}" data-live-record-element="${hit.element}">Delete ${elementLabel}</button>
      </div>
    </div>
  `;
}

function renderTargetSubmenu({ activeDisabled, disabled, isEnd = false } = {}) {
  const actionDisabled = activeDisabled || disabled;
  const label = isEnd ? 'Target Ends' : 'Targets';
  const rows = LIVE_RECORD_TARGET_MENU_ITEMS
    .map(([setAction, endAction, itemLabel]) => `
      <button class="pda-menu-item" data-pda-action="${isEnd ? endAction : setAction}" ${actionDisabled}>
        ${isEnd ? `Set ${itemLabel} End Here` : `Set ${itemLabel} Here`}
      </button>
    `)
    .join('');
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">${label}</div>
      <div class="pda-submenu-panel">
        ${rows}
      </div>
    </div>
  `;
}

export function renderLiveRecordMenuItems({
  bar,
  pdaHit = null,
  segmentHit = null,
  segmentGroupHit = null,
  chartNote = null,
  liveRecordHit = null,
  isShift = false,
} = {}) {
  const disabled = bar ? '' : 'disabled';
  const active = getActiveLiveRecord();
  const activeDisabled = active ? '' : 'disabled';
  const clearActiveRow = active
    ? `<button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.CLEAR_ACTIVE}">Clear Active Live Record</button>`
    : '';
  const lifecycleRows = active
    ? renderLiveRecordStatusRows(active)
    : '';
  const writeRows = `
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.MOVE_ANCHOR}" ${activeDisabled || disabled}>Set Active Live Record Anchor Here</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ENTRY}" ${activeDisabled || disabled}>Set Entry Here</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT}" ${activeDisabled || disabled}>Set MSS Here</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS}" ${activeDisabled || disabled}>Set Stop Loss Here</button>
    ${renderTargetSubmenu({ activeDisabled, disabled })}
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_RESULT_EXIT}" ${activeDisabled || disabled}>Set Result / Exit Here</button>
  `;
  const endRows = isShift
    ? `
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ALL_ENDS}" ${activeDisabled || disabled}>Set All Ends Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ENTRY_END}" ${activeDisabled || disabled}>Set Entry End Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT_END}" ${activeDisabled || disabled}>Set MSS End Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS_END}" ${activeDisabled || disabled}>Set Stop Loss End Here</button>
        ${renderTargetSubmenu({ activeDisabled, disabled, isEnd: true })}
      `
    : '';
  const closeActiveSection = clearActiveRow || lifecycleRows
    ? `<div class="pda-menu-divider"></div>${lifecycleRows}${clearActiveRow}`
    : '';
  return `
    ${getHitLiveRecordMenuItems(liveRecordHit)}
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Live Records</div>
      <div class="pda-submenu-panel">
        <div class="pda-menu-item is-muted">${getActiveLiveRecordLabel()}</div>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.CREATE_BULLISH}" ${disabled}>Create Bullish Live Record Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.CREATE_BEARISH}" ${disabled}>Create Bearish Live Record Here</button>
        <div class="pda-menu-divider"></div>
        ${writeRows}
        ${endRows}
        <div class="pda-menu-divider"></div>
        ${renderEvidenceLinkRows({ active, pdaHit, segmentHit, segmentGroupHit, chartNote })}
        ${closeActiveSection}
      </div>
    </div>
  `;
}

function deleteLiveRecordElement(liveRecordId, element) {
  const record = getLiveRecordById(liveRecordId);
  if (!record) return false;
  if (element === 'anchor') {
    return Boolean(updateLiveRecord(liveRecordId, { anchor: { timestamp: null, price: null, timeframe: 'manual' } }));
  }
  if (element === 'entry' || element === 'marketStructureShift' || element === 'stopLoss') {
    return Boolean(updateLiveRecord(liveRecordId, {
      execution: {
        [element]: {
          timestamp: null,
          timeframe: 'manual',
          price: null,
          endTimestamp: null,
          endTimeframe: 'manual',
        },
      },
    }));
  }
  if (element === 'result') {
    return Boolean(updateLiveRecord(liveRecordId, {
      result: {
        exitTimestamp: null,
        exitTimeframe: 'manual',
        exitPrice: null,
      },
    }));
  }
  const targets = Array.isArray(record.execution?.targets)
    ? record.execution.targets.filter((target) => target.role !== element && target.id !== element)
    : [];
  return Boolean(updateLiveRecord(liveRecordId, { execution: { targets } }));
}

function hideLiveRecordElement(liveRecordId, element) {
  const record = getLiveRecordById(liveRecordId);
  if (!record || !element) return false;
  return Boolean(updateLiveRecord(liveRecordId, {
    display: {
      ...(record.display || {}),
      elementVisibility: {
        ...(record.display?.elementVisibility || {}),
        [element]: false,
      },
    },
  }));
}

export function handleLiveRecordChartAction(action, {
  bar = null,
  price = null,
  timeframe = '',
  pdaHit = null,
  segmentHit = null,
  segmentGroupHit = null,
  chartNote = null,
  liveRecordId = '',
  liveRecordElement = '',
} = {}) {
  if (LIVE_RECORD_STATUS_ACTIONS[action]) {
    const targetId = liveRecordId || getActiveLiveRecord()?.id || '';
    const updated = setLiveRecordLifecycleStatus(targetId, LIVE_RECORD_STATUS_ACTIONS[action]);
    return Boolean(updated) || true;
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.HIT_SET_ACTIVE) {
    const active = setActiveLiveRecord(liveRecordId);
    if (active) clearActiveReviewSet();
    bus.emit('status:update', {
      text: active ? `Active Live Record: ${liveRecordId}` : 'Live Record cannot be activated',
      isError: !active,
    });
    return true;
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.HIT_SELECT_ELEMENT) {
    const selection = selectLiveRecordElement(liveRecordId, liveRecordElement);
    bus.emit('status:update', {
      text: selection ? `Selected ${getLiveRecordElementLabel(liveRecordElement)}` : 'Live Record element cannot be selected',
      isError: !selection,
    });
    return true;
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.HIT_HIDE_ELEMENT) {
    const hidden = recordHistory('Hide Live Record Element', () => hideLiveRecordElement(liveRecordId, liveRecordElement));
    if (hidden) clearLiveRecordElementSelection();
    bus.emit('status:update', {
      text: hidden ? `${getLiveRecordElementLabel(liveRecordElement)} hidden` : 'Live Record element cannot be hidden',
      isError: !hidden,
    });
    return true;
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.HIT_DELETE_ELEMENT) {
    const deleted = recordHistory('Delete Live Record Element', () => deleteLiveRecordElement(liveRecordId, liveRecordElement));
    if (deleted) clearLiveRecordElementSelection();
    bus.emit('status:update', {
      text: deleted ? `${getLiveRecordElementLabel(liveRecordElement)} deleted` : 'Live Record element cannot be deleted',
      isError: !deleted,
    });
    return true;
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.HIT_DELETE_RECORD) {
    const deleted = recordHistory('Delete Live Record', () => deleteLiveRecord(liveRecordId));
    clearLiveRecordElementSelection();
    bus.emit('status:update', {
      text: deleted ? `Live Record deleted: ${liveRecordId}` : 'Live Record cannot be deleted',
      isError: !deleted,
    });
    return true;
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.CLEAR_ACTIVE) {
    const cleared = clearActiveLiveRecord();
    bus.emit('status:update', {
      text: cleared ? 'Active Live Record closed' : 'No active Live Record',
      isError: false,
    });
    return true;
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.MOVE_ANCHOR) {
    return patchActiveFromChart('Move Live Record Anchor', () => ({
      anchor: getChartAnchor({ bar, price, timeframe }),
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_ENTRY) {
    return patchActiveFromChart('Set Live Record Entry', () => ({
      execution: {
        entry: {
          ...getChartAnchor({ bar, price, timeframe }),
          endTimestamp: null,
          endTimeframe: 'manual',
        },
      },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT) {
    return patchActiveFromChart('Set Live Record MSS', () => ({
      execution: {
        marketStructureShift: {
          ...getChartAnchor({ bar, price, timeframe }),
          endTimestamp: null,
          endTimeframe: 'manual',
        },
      },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS) {
    return patchActiveFromChart('Set Live Record Stop Loss', () => ({
      execution: {
        stopLoss: {
          ...getChartAnchor({ bar, price, timeframe }),
          endTimestamp: null,
          endTimeframe: 'manual',
        },
      },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_ENTRY_END) {
    return patchActiveFromChart('Set Live Record Entry End', () => ({
      execution: { entry: getChartEnd({ bar, timeframe }) },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT_END) {
    return patchActiveFromChart('Set Live Record MSS End', () => ({
      execution: { marketStructureShift: getChartEnd({ bar, timeframe }) },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS_END) {
    return patchActiveFromChart('Set Live Record Stop Loss End', () => ({
      execution: { stopLoss: getChartEnd({ bar, timeframe }) },
    }), { bar });
  }
  if (LIVE_RECORD_TARGET_ACTIONS[action]) {
    return patchActiveFromChart('Set Live Record Target', (active) => {
      const target = LIVE_RECORD_TARGET_ACTIONS[action];
      return {
        execution: {
          targets: upsertTarget(active.execution?.targets, {
            ...target,
            ...getChartAnchor({ bar, price, timeframe }),
            endTimestamp: null,
            endTimeframe: 'manual',
          }),
        },
      };
    }, { bar });
  }
  if (LIVE_RECORD_TARGET_END_ACTIONS[action]) {
    return patchActiveFromChart('Set Live Record Target End', (active) => {
      const targets = setTargetEnd(
        active.execution?.targets,
        LIVE_RECORD_TARGET_END_ACTIONS[action],
        getChartEnd({ bar, timeframe })
      );
      if (!targets) return null;
      return { execution: { targets } };
    }, { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_RESULT_EXIT) {
    return patchActiveFromChart('Set Live Record Result Exit', () => {
      const anchor = getChartAnchor({ bar, price, timeframe });
      return {
        result: {
          exitTimestamp: anchor.timestamp,
          exitTimeframe: anchor.timeframe,
          exitPrice: anchor.price,
        },
      };
    }, { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_ALL_ENDS) {
    return patchActiveFromChart('Set Live Record Ends', (active) => ({
      execution: setAllElementEnds(active.execution, getChartEnd({ bar, timeframe })),
    }), { bar });
  }
  if (LIVE_RECORD_LINK_ACTIONS[action]) {
    return linkContextObjectToActiveLiveRecord(action, {
      pdaHit,
      segmentHit,
      segmentGroupHit,
      chartNote,
    });
  }
  const createDirection = action === LIVE_RECORD_CHART_ACTIONS.CREATE_BULLISH
    ? LIVE_RECORD_DIRECTIONS.LONG
    : action === LIVE_RECORD_CHART_ACTIONS.CREATE_BEARISH
      ? LIVE_RECORD_DIRECTIONS.SHORT
      : action === LIVE_RECORD_CHART_ACTIONS.NEW_HERE
        ? LIVE_RECORD_DIRECTIONS.UNKNOWN
        : '';
  if (!createDirection) return false;
  if (!bar || !Number.isFinite(Number(bar.timestamp))) {
    bus.emit('status:update', { text: 'Cannot create Live Record: no chart bar selected', isError: true });
    return true;
  }
  const anchorPrice = getAnchorPrice(bar, price);
  const createLabel = createDirection === LIVE_RECORD_DIRECTIONS.LONG
    ? 'Create Bullish Live Record'
    : createDirection === LIVE_RECORD_DIRECTIONS.SHORT
      ? 'Create Bearish Live Record'
      : 'Create Live Record';
  const created = recordHistory(createLabel, () => createLiveRecordFromAnchor({
    timestamp: Number(bar.timestamp),
    timeframe,
    price: anchorPrice,
  }, {
    instrument: getPrimaryInstrument(),
    direction: createDirection,
    summary: '',
  }));
  if (created?.id) clearActiveReviewSet();
  bus.emit('status:update', {
    text: created?.id ? `${createLabel}: ${created.id}` : 'Live Record creation failed',
    isError: !created?.id,
  });
  return true;
}
