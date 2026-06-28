import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getSmtRecords } from '../smt/smt-store.js';
import { getActiveLiveRecord } from './live-record-active.js';
import { getLiveRecordById } from './live-record-store.js';
import {
  getLiveRecordAllowedNextStatuses,
  getLiveRecordStatusLabel,
} from './live-record-lifecycle.js';
import {
  LIVE_RECORD_DIRECTIONS,
  LIVE_RECORD_STATUSES,
} from './live-record-types.js';

const ACTIONS = Object.freeze({
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
});

const STATUS_ACTIONS = Object.freeze({
  'live-record-status-planned': LIVE_RECORD_STATUSES.PLANNED,
  'live-record-status-active': LIVE_RECORD_STATUSES.ACTIVE,
  'live-record-status-submitted': LIVE_RECORD_STATUSES.SUBMITTED,
  'live-record-status-filled': LIVE_RECORD_STATUSES.FILLED,
  'live-record-status-cancelled': LIVE_RECORD_STATUSES.CANCELLED,
  'live-record-status-closed': LIVE_RECORD_STATUSES.CLOSED,
  'live-record-status-reviewed': LIVE_RECORD_STATUSES.REVIEWED,
});

const TARGET_MENU_ITEMS = Object.freeze([
  [ACTIONS.SET_TARGET_INTERNAL_1, ACTIONS.SET_TARGET_INTERNAL_1_END, 'Target Internal 1'],
  [ACTIONS.SET_TARGET_INTERNAL_2, ACTIONS.SET_TARGET_INTERNAL_2_END, 'Target Internal 2'],
  [ACTIONS.SET_TARGET_INTERNAL_3, ACTIONS.SET_TARGET_INTERNAL_3_END, 'Target Internal 3'],
  [ACTIONS.SET_TARGET_SWING_POINT, ACTIONS.SET_TARGET_SWING_POINT_END, 'Target Swing Point'],
  [ACTIONS.SET_TARGET_EXTERNAL_1, ACTIONS.SET_TARGET_EXTERNAL_1_END, 'Target External 1'],
  [ACTIONS.SET_TARGET_EXTERNAL_2, ACTIONS.SET_TARGET_EXTERNAL_2_END, 'Target External 2'],
  [ACTIONS.SET_FINAL_TARGET, ACTIONS.SET_FINAL_TARGET_END, 'Target External 3'],
]);

function renderEvidenceLinkRows({ active, pdaHit, segmentHit, segmentGroupHit, chartNote } = {}) {
  const activeDisabled = active ? '' : 'disabled';
  const pdaDisabled = active && pdaHit ? '' : 'disabled';
  const segmentDisabled = active && segmentHit ? '' : 'disabled';
  const compositeDisabled = active && segmentGroupHit ? '' : 'disabled';
  const smtDisabled = active && getSmtRecords().filter((record) => record.primaryInstrument === getPrimaryInstrument()).length ? '' : 'disabled';
  const chartNoteDisabled = active && chartNote ? '' : 'disabled';
  return `
    <button class="pda-menu-item" data-pda-action="${ACTIONS.LINK_PDA}" ${activeDisabled || pdaDisabled}>Link PDA To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${ACTIONS.LINK_SEGMENT}" ${activeDisabled || segmentDisabled}>Link Segment To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${ACTIONS.LINK_COMPOSITE}" ${activeDisabled || compositeDisabled}>Link Composite To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${ACTIONS.LINK_LATEST_SMT}" ${activeDisabled || smtDisabled}>Link Latest SMT To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${ACTIONS.LINK_CHART_NOTE}" ${activeDisabled || chartNoteDisabled}>Link Chart Note To Active Live Record</button>
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
  return Object.entries(STATUS_ACTIONS)
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

export function getLiveRecordElementLabel(role) {
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
  return timestamp ? `${direction} ${timestamp}` : liveRecordId.slice(0, 18);
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
        <button class="pda-menu-item" data-pda-action="${ACTIONS.HIT_SET_ACTIVE}" data-live-record-id="${liveRecordId}">Set Active · ${recordLabel}</button>
        ${renderLiveRecordStatusRows(record)}
        <button class="pda-menu-item" data-pda-action="${ACTIONS.HIT_DELETE_RECORD}" data-live-record-id="${liveRecordId}">Delete Live Record</button>
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="${ACTIONS.HIT_SELECT_ELEMENT}" data-live-record-id="${liveRecordId}" data-live-record-element="${hit.element}">Select ${elementLabel}</button>
        <button class="pda-menu-item" data-pda-action="${ACTIONS.HIT_HIDE_ELEMENT}" data-live-record-id="${liveRecordId}" data-live-record-element="${hit.element}">Hide ${elementLabel}</button>
        <button class="pda-menu-item" data-pda-action="${ACTIONS.HIT_DELETE_ELEMENT}" data-live-record-id="${liveRecordId}" data-live-record-element="${hit.element}">Delete ${elementLabel}</button>
      </div>
    </div>
  `;
}

function renderTargetSubmenu({ activeDisabled, disabled, isEnd = false } = {}) {
  const actionDisabled = activeDisabled || disabled;
  const label = isEnd ? 'Target Ends' : 'Targets';
  const rows = TARGET_MENU_ITEMS
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
    ? `<button class="pda-menu-item" data-pda-action="${ACTIONS.CLEAR_ACTIVE}">Clear Active Live Record</button>`
    : '';
  const lifecycleRows = active ? renderLiveRecordStatusRows(active) : '';
  const writeRows = `
    <button class="pda-menu-item" data-pda-action="${ACTIONS.MOVE_ANCHOR}" ${activeDisabled || disabled}>Set Active Live Record Anchor Here</button>
    <button class="pda-menu-item" data-pda-action="${ACTIONS.SET_ENTRY}" ${activeDisabled || disabled}>Set Entry Here</button>
    <button class="pda-menu-item" data-pda-action="${ACTIONS.SET_MARKET_STRUCTURE_SHIFT}" ${activeDisabled || disabled}>Set MSS Here</button>
    <button class="pda-menu-item" data-pda-action="${ACTIONS.SET_STOP_LOSS}" ${activeDisabled || disabled}>Set Stop Loss Here</button>
    ${renderTargetSubmenu({ activeDisabled, disabled })}
    <button class="pda-menu-item" data-pda-action="${ACTIONS.SET_RESULT_EXIT}" ${activeDisabled || disabled}>Set Result / Exit Here</button>
  `;
  const endRows = isShift
    ? `
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="${ACTIONS.SET_ALL_ENDS}" ${activeDisabled || disabled}>Set All Ends Here</button>
        <button class="pda-menu-item" data-pda-action="${ACTIONS.SET_ENTRY_END}" ${activeDisabled || disabled}>Set Entry End Here</button>
        <button class="pda-menu-item" data-pda-action="${ACTIONS.SET_MARKET_STRUCTURE_SHIFT_END}" ${activeDisabled || disabled}>Set MSS End Here</button>
        <button class="pda-menu-item" data-pda-action="${ACTIONS.SET_STOP_LOSS_END}" ${activeDisabled || disabled}>Set Stop Loss End Here</button>
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
        <button class="pda-menu-item" data-pda-action="${ACTIONS.CREATE_BULLISH}" ${disabled}>Create Bullish Live Record Here</button>
        <button class="pda-menu-item" data-pda-action="${ACTIONS.CREATE_BEARISH}" ${disabled}>Create Bearish Live Record Here</button>
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
