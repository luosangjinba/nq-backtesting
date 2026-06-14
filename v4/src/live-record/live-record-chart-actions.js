import * as bus from '../event-bus.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { recordHistory } from '../history/history-manager.js';
import {
  clearActiveLiveRecord,
  createLiveRecordFromAnchor,
  getActiveLiveRecord,
} from './live-record-active.js';
import { LIVE_RECORD_DIRECTIONS } from './live-record-types.js';

export const LIVE_RECORD_CHART_ACTIONS = Object.freeze({
  NEW_HERE: 'live-record-new-here',
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

function getAnchorPrice(bar = {}, fallbackPrice = null) {
  const price = Number(fallbackPrice);
  if (Number.isFinite(price)) return price;
  const close = Number(bar.close);
  return Number.isFinite(close) ? close : null;
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

export function renderLiveRecordMenuItems({ bar, isShift = false } = {}) {
  const disabled = bar ? '' : 'disabled';
  const active = getActiveLiveRecord();
  const activeDisabled = active ? '' : 'disabled';
  const clearActiveRow = active
    ? `<button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.CLEAR_ACTIVE}">Close Active Live Record</button>`
    : '';
  const actionRows = isShift
    ? `
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ENTRY_END}" ${activeDisabled || disabled}>Set Entry End Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT_END}" ${activeDisabled || disabled}>Set MSS End Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS_END}" ${activeDisabled || disabled}>Set Stop Loss End Here</button>
        ${renderTargetSubmenu({ activeDisabled, disabled, isEnd: true })}
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ALL_ENDS}" ${activeDisabled || disabled}>Set All Ends Here</button>
      `
    : `
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.MOVE_ANCHOR}" ${activeDisabled || disabled}>Set Active Live Record Anchor Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ENTRY}" ${activeDisabled || disabled}>Set Entry Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT}" ${activeDisabled || disabled}>Set MSS Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS}" ${activeDisabled || disabled}>Set Stop Loss Here</button>
        ${renderTargetSubmenu({ activeDisabled, disabled })}
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_RESULT_EXIT}" ${activeDisabled || disabled}>Set Result / Exit Here</button>
      `;
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Live Records</div>
      <div class="pda-submenu-panel">
        <div class="pda-menu-item is-muted">${getActiveLiveRecordLabel()}</div>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.NEW_HERE}" ${disabled}>New Live Record Here</button>
        ${actionRows}
        ${clearActiveRow}
      </div>
    </div>
  `;
}

export function handleLiveRecordChartAction(action, {
  bar = null,
  price = null,
  timeframe = '',
} = {}) {
  if (action === LIVE_RECORD_CHART_ACTIONS.CLEAR_ACTIVE) {
    const cleared = clearActiveLiveRecord();
    bus.emit('status:update', {
      text: cleared ? 'Active Live Record closed' : 'No active Live Record',
      isError: false,
    });
    return true;
  }
  if (action !== LIVE_RECORD_CHART_ACTIONS.NEW_HERE) {
    if (Object.values(LIVE_RECORD_CHART_ACTIONS).includes(action)) {
      bus.emit('status:update', {
        text: 'Live Record chart action is planned for Step 286.5',
        isError: true,
      });
      return true;
    }
    return false;
  }
  if (!bar || !Number.isFinite(Number(bar.timestamp))) {
    bus.emit('status:update', { text: 'Cannot create Live Record: no chart bar selected', isError: true });
    return true;
  }
  const anchorPrice = getAnchorPrice(bar, price);
  const created = recordHistory('Create Live Record', () => createLiveRecordFromAnchor({
    timestamp: Number(bar.timestamp),
    timeframe,
    price: anchorPrice,
  }, {
    instrument: getPrimaryInstrument(),
    summary: '',
  }));
  bus.emit('status:update', {
    text: created?.id ? `Live Record created: ${created.id}` : 'Live Record creation failed',
    isError: !created?.id,
  });
  return true;
}
