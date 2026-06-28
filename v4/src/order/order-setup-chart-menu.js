import { getSmtRecords } from '../smt/smt-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getActiveReviewSet, getActiveReviewSetId } from './order-review-active.js';
import { ORDER_DIRECTIONS } from './order-review-types.js';

export function getCurrentMainSmtRecords() {
  const instrument = getPrimaryInstrument();
  return getSmtRecords().filter((record) => record.primaryInstrument === instrument);
}

function getActiveSetupLabel() {
  const active = getActiveReviewSet();
  if (!active) return 'No active setup';
  const direction = active.direction === ORDER_DIRECTIONS.LONG
    ? 'Long'
    : active.direction === ORDER_DIRECTIONS.SHORT
      ? 'Short'
      : 'Unknown';
  return `${direction} · ${active.id.slice(0, 18)}`;
}

export function getOrderSetupElementLabel(role) {
  if (role === 'entry') return 'Entry';
  if (role === 'marketStructureShift') return 'MSS';
  if (role === 'stopLoss') return 'Stop Loss';
  if (role === 'target1') return 'Target Internal 1';
  if (role === 'targetInternal2') return 'Target Internal 2';
  if (role === 'targetInternal3') return 'Target Internal 3';
  if (role === 'target2') return 'Target Swing Point';
  if (role === 'target3') return 'Target External 1';
  if (role === 'targetExternal2') return 'Target External 2';
  if (role === 'finalTarget') return 'Target External 3';
  if (role === 'reversal') return 'Reversal';
  return role || 'Element';
}

function getHitSetupMenuItems(orderSetupHit) {
  const hit = orderSetupHit?.primaryHit || (Array.isArray(orderSetupHit?.hits) ? orderSetupHit.hits[0] : null);
  if (!hit?.setupId) return '';
  const activeId = getActiveReviewSetId();
  const clearActive = activeId
    ? '<button class="pda-menu-item" data-pda-action="order-setup-hit-clear-active">Close Active Setup</button>'
    : '';
  const primaryRows = hit.element === 'reversal'
    ? (() => {
        const active = hit.setupId === activeId;
        const label = `${active ? 'Active' : 'Set Active'} · ${hit.setupId.slice(0, 18)}`;
        return `
        <button class="pda-menu-item" data-pda-action="order-setup-hit-set-active" data-order-setup-id="${hit.setupId}">${label}</button>
        <button class="pda-menu-item" data-pda-action="order-setup-hit-hide" data-order-setup-id="${hit.setupId}">Hide Setup</button>
        <button class="pda-menu-item" data-pda-action="order-setup-hit-delete-setup" data-order-setup-id="${hit.setupId}">Delete Setup</button>
      `;
      })()
    : (() => {
        const label = `${getOrderSetupElementLabel(hit.element)} · ${hit.setupId.slice(0, 18)}`;
        return `
        <button class="pda-menu-item" data-pda-action="order-setup-hit-select-element" data-order-setup-id="${hit.setupId}" data-order-setup-element="${hit.element}">Select ${label}</button>
        <button class="pda-menu-item" data-pda-action="order-setup-hit-delete-element" data-order-setup-id="${hit.setupId}" data-order-setup-element="${hit.element}">Delete ${label}</button>
      `;
      })();
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Order Setup Element</div>
      <div class="pda-submenu-panel">
        ${primaryRows}
        ${clearActive}
      </div>
    </div>
  `;
}

const ORDER_SETUP_TARGET_MENU_ITEMS = Object.freeze([
  ['order-setup-set-target-internal', 'order-setup-set-target-internal-end', 'Target Internal 1'],
  ['order-setup-set-target-internal-2', 'order-setup-set-target-internal-2-end', 'Target Internal 2'],
  ['order-setup-set-target-internal-3', 'order-setup-set-target-internal-3-end', 'Target Internal 3'],
  ['order-setup-set-target-swing', 'order-setup-set-target-swing-end', 'Target Swing Point'],
  ['order-setup-set-target-external', 'order-setup-set-target-external-end', 'Target External 1'],
  ['order-setup-set-target-external-2', 'order-setup-set-target-external-2-end', 'Target External 2'],
  ['order-setup-set-final-target', 'order-setup-set-final-target-end', 'Target External 3'],
]);

function renderTargetSubmenu({ activeDisabled, disabled, isEnd = false } = {}) {
  const actionDisabled = activeDisabled || disabled;
  const label = isEnd ? 'Target Ends' : 'Targets';
  const rows = ORDER_SETUP_TARGET_MENU_ITEMS
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

export function renderOrderSetupMenuItems({ bar, pdaHit, segmentHit, segmentGroupHit, orderSetupHit, isShift = false } = {}) {
  const active = getActiveReviewSet();
  const disabled = bar ? '' : 'disabled';
  const activeDisabled = active ? '' : 'disabled';
  const pdaDisabled = active && pdaHit ? '' : 'disabled';
  const segmentDisabled = active && segmentHit ? '' : 'disabled';
  const compositeDisabled = active && segmentGroupHit ? '' : 'disabled';
  const smtDisabled = active && getCurrentMainSmtRecords().length ? '' : 'disabled';

  return `
    ${getHitSetupMenuItems(orderSetupHit)}
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Order Setup · ${getActiveSetupLabel()}</div>
      <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="order-setup-create-bullish" ${disabled}>Create Bullish Setup Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-create-bearish" ${disabled}>Create Bearish Setup Here</button>
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="order-setup-set-reversal" ${activeDisabled || disabled}>Move Active Reversal Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-entry" ${activeDisabled || disabled}>Set Entry Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-market-structure-shift" ${activeDisabled || disabled}>Set MSS Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-stop-loss" ${activeDisabled || disabled}>Set Stop Loss Here</button>
        ${renderTargetSubmenu({ activeDisabled, disabled })}
        ${isShift ? `
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="order-setup-set-all-end" ${activeDisabled || disabled}>Set All End Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-entry-end" ${activeDisabled || disabled}>Set Entry End Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-market-structure-shift-end" ${activeDisabled || disabled}>Set MSS End Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-stop-loss-end" ${activeDisabled || disabled}>Set Stop Loss End Here</button>
        ${renderTargetSubmenu({ activeDisabled, disabled, isEnd: true })}
        ` : ''}
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="order-setup-link-pda" ${pdaDisabled}>Link PDA To Active Setup</button>
        <button class="pda-menu-item" data-pda-action="order-setup-link-segment" ${segmentDisabled}>Link Segment To Active Setup</button>
        <button class="pda-menu-item" data-pda-action="order-setup-link-composite" ${compositeDisabled}>Link Composite To Active Setup</button>
        <button class="pda-menu-item" data-pda-action="order-setup-link-latest-smt" ${smtDisabled}>Link Latest SMT To Active Setup</button>
        <button class="pda-menu-item" data-pda-action="order-setup-add-manual-event" ${activeDisabled || disabled}>Add Manual Explanation Event Here</button>
      </div>
    </div>
  `;
}
