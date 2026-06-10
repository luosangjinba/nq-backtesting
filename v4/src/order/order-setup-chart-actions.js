// Chart context-menu actions for creating and editing the active Order Setup.

import * as bus from '../event-bus.js';
import { getAnnotationById } from '../pda/pda-store.js';
import { getPdaType } from '../pda/pda-types.js';
import { getSegmentById } from '../segment/segment-store.js';
import { getSmtRecords } from '../smt/smt-store.js';
import {
  createChartReviewSet,
  clearActiveReviewSet,
  getActiveReviewSet,
  getActiveReviewSetId,
  linkRefToActiveReviewSet,
  setActiveReviewSet,
  updateActiveReviewSet,
} from './order-review-active.js';
import {
  deleteOrderReview,
  getOrderReviewById,
  updateOrderReview,
} from './order-review-store.js';
import {
  ORDER_DIRECTIONS,
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
} from './order-review-types.js';
import {
  buildPdaOrderRefMetadata,
  buildSegmentOrderRefMetadata,
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from './order-ref-metadata.js';
import { recordHistory } from '../history/history-manager.js';
import {
  clearOrderSetupElementSelection,
  selectOrderSetupElement,
} from './order-setup-selection.js';

const ORDER_ELEMENT_MAGNET_TOLERANCE_PX = 10;

function getPdaLabel(annotation) {
  if (!annotation) return 'PDA';
  return getPdaType(annotation.type)?.label || annotation.type?.toUpperCase() || 'PDA';
}

function getSegmentLabel(segment) {
  if (!segment) return 'Segment';
  return getSegmentOrderRefLabel(segment);
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

function getHitSetupMenuItems(orderSetupHit) {
  const hits = Array.isArray(orderSetupHit?.hits) ? orderSetupHit.hits : [];
  if (!hits.length) return '';
  const activeId = getActiveReviewSetId();
  const reversalHits = hits.filter((hit) => hit.element === 'reversal');
  const elementHits = hits.filter((hit) => hit.element !== 'reversal');
  const reversalRows = reversalHits
    .map((hit) => {
      const active = hit.setupId === activeId;
      const label = `${active ? 'Active' : 'Set Active'} · ${hit.setupId.slice(0, 18)}`;
      return `
        <button class="pda-menu-item" data-pda-action="order-setup-hit-set-active" data-order-setup-id="${hit.setupId}">${label}</button>
        <button class="pda-menu-item" data-pda-action="order-setup-hit-hide" data-order-setup-id="${hit.setupId}">Hide Setup</button>
        <button class="pda-menu-item" data-pda-action="order-setup-hit-delete-setup" data-order-setup-id="${hit.setupId}">Delete Setup</button>
      `;
    })
    .join('');
  const elementRows = elementHits
    .map((hit) => {
      const label = `${getOrderSetupElementLabel(hit.element)} · ${hit.setupId.slice(0, 18)}`;
      return `
        <button class="pda-menu-item" data-pda-action="order-setup-hit-select-element" data-order-setup-id="${hit.setupId}" data-order-setup-element="${hit.element}">Select ${label}</button>
        <button class="pda-menu-item" data-pda-action="order-setup-hit-delete-element" data-order-setup-id="${hit.setupId}" data-order-setup-element="${hit.element}">Delete ${label}</button>
      `;
    })
    .join('');
  const clearActive = activeId
    ? '<button class="pda-menu-item" data-pda-action="order-setup-hit-clear-active">Close Active Setup</button>'
    : '';
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Order Setup Element</div>
      <div class="pda-submenu-panel">
        ${reversalRows}
        ${elementRows}
        ${clearActive}
      </div>
    </div>
  `;
}

function getOrderSetupElementLabel(role) {
  if (role === 'entry') return 'Entry';
  if (role === 'marketStructureShift') return 'MSS';
  if (role === 'stopLoss') return 'Stop Loss';
  if (role === 'target1') return 'Target Internal 1';
  if (role === 'targetInternal2') return 'Target Internal 2';
  if (role === 'targetInternal3') return 'Target Internal 3';
  if (role === 'target2') return 'Target Swing Point';
  if (role === 'target3') return 'Target External 1';
  if (role === 'targetExternal2') return 'Target External 2';
  if (role === 'finalTarget') return 'Target External The Best';
  if (role === 'reversal') return 'Reversal';
  return role || 'Element';
}

const ORDER_SETUP_TARGET_MENU_ITEMS = Object.freeze([
  ['order-setup-set-target-internal', 'order-setup-set-target-internal-end', 'Target Internal 1'],
  ['order-setup-set-target-internal-2', 'order-setup-set-target-internal-2-end', 'Target Internal 2'],
  ['order-setup-set-target-internal-3', 'order-setup-set-target-internal-3-end', 'Target Internal 3'],
  ['order-setup-set-target-swing', 'order-setup-set-target-swing-end', 'Target Swing Point'],
  ['order-setup-set-target-external', 'order-setup-set-target-external-end', 'Target External 1'],
  ['order-setup-set-target-external-2', 'order-setup-set-target-external-2-end', 'Target External 2'],
  ['order-setup-set-final-target', 'order-setup-set-final-target-end', 'Target External The Best'],
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

const ORDER_SETUP_PATCH_ACTIONS = Object.freeze({
  'order-setup-set-reversal': {
    patch: ({ context, price }) => ({
      setupThesis: {
        primaryEventTimestamp: context.bar.timestamp,
        primaryEventTimeframe: context.timeframe,
        primaryEventPrice: price,
      },
    }),
  },
  'order-setup-set-event': {
    patch: ({ context, price }) => ({
      setupThesis: {
        primaryEventTimestamp: context.bar.timestamp,
        primaryEventTimeframe: context.timeframe,
        primaryEventPrice: price,
      },
    }),
  },
  'order-setup-set-entry': {
    anchor: 'strict',
    patch: ({ anchor }) => ({
      entryPlan: {
        entryTimestamp: anchor.timestamp,
        entryTimeframe: anchor.timeframe,
        entryPrice: anchor.price,
        entryEndTimestamp: null,
        entryEndTimeframe: 'manual',
      },
    }),
  },
  'order-setup-set-entry-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        entryEndTimestamp: endTimestamp,
        entryEndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-market-structure-shift': {
    anchor: 'strict',
    patch: ({ anchor }) => ({
      entryPlan: {
        marketStructureShift: anchor.price,
        marketStructureShiftTimestamp: anchor.timestamp,
        marketStructureShiftTimeframe: anchor.timeframe,
        marketStructureShiftEndTimestamp: null,
        marketStructureShiftEndTimeframe: 'manual',
      },
    }),
  },
  'order-setup-set-market-structure-shift-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        marketStructureShiftEndTimestamp: endTimestamp,
        marketStructureShiftEndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-entry-time': {
    patch: ({ context }) => ({
      entryPlan: {
        entryTimestamp: context.bar.timestamp,
        entryTimeframe: context.timeframe,
      },
    }),
  },
  'order-setup-set-exit-time': {
    patch: ({ context }) => ({
      resultReview: {
        exitTimestamp: context.bar.timestamp,
      },
    }),
  },
  'order-setup-set-entry-price': {
    patch: ({ price }) => ({ entryPlan: { entryPrice: price } }),
  },
  'order-setup-set-stop-loss': {
    anchor: 'strict',
    patch: ({ anchor }) => ({
      entryPlan: {
        stopLoss: anchor.price,
        stopLossTimestamp: anchor.timestamp,
        stopLossTimeframe: anchor.timeframe,
        stopLossEndTimestamp: null,
        stopLossEndTimeframe: 'manual',
      },
    }),
  },
  'order-setup-set-stop-loss-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        stopLossEndTimestamp: endTimestamp,
        stopLossEndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-target-internal': {
    anchor: 'target',
    patch: ({ anchor }) => ({
      entryPlan: {
        targetInternal: anchor.price,
        targetInternalTimestamp: anchor.timestamp,
        targetInternalTimeframe: anchor.timeframe,
        targetInternalEndTimestamp: null,
        targetInternalEndTimeframe: 'manual',
        selectedTargetType: 'internal',
      },
    }),
  },
  'order-setup-set-target-internal-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        targetInternalEndTimestamp: endTimestamp,
        targetInternalEndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-target-internal-2': {
    anchor: 'target',
    patch: ({ anchor }) => ({
      entryPlan: {
        targetInternal2: anchor.price,
        targetInternal2Timestamp: anchor.timestamp,
        targetInternal2Timeframe: anchor.timeframe,
        targetInternal2EndTimestamp: null,
        targetInternal2EndTimeframe: 'manual',
        selectedTargetType: 'internal',
      },
    }),
  },
  'order-setup-set-target-internal-2-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        targetInternal2EndTimestamp: endTimestamp,
        targetInternal2EndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-target-internal-3': {
    anchor: 'target',
    patch: ({ anchor }) => ({
      entryPlan: {
        targetInternal3: anchor.price,
        targetInternal3Timestamp: anchor.timestamp,
        targetInternal3Timeframe: anchor.timeframe,
        targetInternal3EndTimestamp: null,
        targetInternal3EndTimeframe: 'manual',
        selectedTargetType: 'internal',
      },
    }),
  },
  'order-setup-set-target-internal-3-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        targetInternal3EndTimestamp: endTimestamp,
        targetInternal3EndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-target-swing': {
    anchor: 'target',
    patch: ({ anchor }) => ({
      entryPlan: {
        targetSwing: anchor.price,
        targetSwingTimestamp: anchor.timestamp,
        targetSwingTimeframe: anchor.timeframe,
        targetSwingEndTimestamp: null,
        targetSwingEndTimeframe: 'manual',
        selectedTargetType: 'swing',
      },
    }),
  },
  'order-setup-set-target-swing-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        targetSwingEndTimestamp: endTimestamp,
        targetSwingEndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-target-external': {
    anchor: 'target',
    patch: ({ anchor }) => ({
      entryPlan: {
        targetExternal: anchor.price,
        targetExternalTimestamp: anchor.timestamp,
        targetExternalTimeframe: anchor.timeframe,
        targetExternalEndTimestamp: null,
        targetExternalEndTimeframe: 'manual',
        selectedTargetType: 'external',
      },
    }),
  },
  'order-setup-set-target-external-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        targetExternalEndTimestamp: endTimestamp,
        targetExternalEndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-target-external-2': {
    anchor: 'target',
    patch: ({ anchor }) => ({
      entryPlan: {
        targetExternal2: anchor.price,
        targetExternal2Timestamp: anchor.timestamp,
        targetExternal2Timeframe: anchor.timeframe,
        targetExternal2EndTimestamp: null,
        targetExternal2EndTimeframe: 'manual',
        selectedTargetType: 'external',
      },
    }),
  },
  'order-setup-set-target-external-2-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        targetExternal2EndTimestamp: endTimestamp,
        targetExternal2EndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-final-target': {
    anchor: 'target',
    patch: ({ anchor }) => ({
      entryPlan: {
        finalTarget: anchor.price,
        finalTargetTimestamp: anchor.timestamp,
        finalTargetTimeframe: anchor.timeframe,
        finalTargetEndTimestamp: null,
        finalTargetEndTimeframe: 'manual',
      },
    }),
  },
  'order-setup-set-final-target-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        finalTargetEndTimestamp: endTimestamp,
        finalTargetEndTimeframe: endTimeframe,
      },
    }),
  },
  'order-setup-set-all-end': {
    patch: ({ endTimestamp, endTimeframe }) => ({
      entryPlan: {
        entryEndTimestamp: endTimestamp,
        entryEndTimeframe: endTimeframe,
        stopLossEndTimestamp: endTimestamp,
        stopLossEndTimeframe: endTimeframe,
        targetInternalEndTimestamp: endTimestamp,
        targetInternalEndTimeframe: endTimeframe,
        targetInternal2EndTimestamp: endTimestamp,
        targetInternal2EndTimeframe: endTimeframe,
        targetInternal3EndTimestamp: endTimestamp,
        targetInternal3EndTimeframe: endTimeframe,
        targetSwingEndTimestamp: endTimestamp,
        targetSwingEndTimeframe: endTimeframe,
        targetExternalEndTimestamp: endTimestamp,
        targetExternalEndTimeframe: endTimeframe,
        targetExternal2EndTimestamp: endTimestamp,
        targetExternal2EndTimeframe: endTimeframe,
        finalTargetEndTimestamp: endTimestamp,
        finalTargetEndTimeframe: endTimeframe,
      },
    }),
  },
});

const ORDER_SETUP_LINK_ACTIONS = Object.freeze({
  'order-setup-link-pda': {
    getTarget: (context) => context.pdaHit ? getAnnotationById(context.pdaHit.id) : null,
    buildRef: (annotation) => ({
      type: ORDER_REF_TYPES.PDA,
      id: annotation.id,
      role: ORDER_REF_ROLES.CONTEXT,
      ...buildPdaOrderRefMetadata(annotation),
    }),
    label: (annotation) => `${getPdaOrderRefLabel(annotation)} linked to active setup`,
  },
  'order-setup-link-segment': {
    getTarget: (context) => context.segmentHit ? getSegmentById(context.segmentHit.id) : null,
    buildRef: (segment) => ({
      type: ORDER_REF_TYPES.SEGMENT,
      id: segment.id,
      role: ORDER_REF_ROLES.CONTEXT,
      ...buildSegmentOrderRefMetadata(segment),
    }),
    label: (segment) => `${getSegmentLabel(segment)} linked to active setup`,
  },
  'order-setup-link-composite': {
    getTarget: (context) => context.segmentGroupHit?.id ? context.segmentGroupHit : null,
    buildRef: (group) => ({
      type: ORDER_REF_TYPES.COMPOSITE,
      id: group.id,
      role: ORDER_REF_ROLES.CONTEXT,
    }),
    label: () => 'Composite linked to active setup',
  },
  'order-setup-link-latest-smt': {
    getTarget: () => getSmtRecords().at(-1) || null,
    buildRef: (smt) => ({
      type: ORDER_REF_TYPES.SMT,
      id: smt.id,
      role: ORDER_REF_ROLES.CONFIRMATION,
    }),
    label: () => 'Latest SMT linked to active setup',
  },
});

function getOrderSetupElementDeletePatch(role) {
  if (role === 'entry') return { entryPlan: { entryTimestamp: null, entryPrice: null, entryEndTimestamp: null, entryEndTimeframe: 'manual' } };
  if (role === 'marketStructureShift') return { entryPlan: { marketStructureShift: null, marketStructureShiftTimestamp: null, marketStructureShiftTimeframe: 'manual', marketStructureShiftEndTimestamp: null, marketStructureShiftEndTimeframe: 'manual' } };
  if (role === 'stopLoss') return { entryPlan: { stopLoss: null, stopLossTimestamp: null, stopLossTimeframe: 'manual', stopLossEndTimestamp: null, stopLossEndTimeframe: 'manual' } };
  if (role === 'target1') return { entryPlan: { targetInternal: null, targetInternalTimestamp: null, targetInternalTimeframe: 'manual', targetInternalEndTimestamp: null, targetInternalEndTimeframe: 'manual' } };
  if (role === 'targetInternal2') return { entryPlan: { targetInternal2: null, targetInternal2Timestamp: null, targetInternal2Timeframe: 'manual', targetInternal2EndTimestamp: null, targetInternal2EndTimeframe: 'manual' } };
  if (role === 'targetInternal3') return { entryPlan: { targetInternal3: null, targetInternal3Timestamp: null, targetInternal3Timeframe: 'manual', targetInternal3EndTimestamp: null, targetInternal3EndTimeframe: 'manual' } };
  if (role === 'target2') return { entryPlan: { targetSwing: null, targetSwingTimestamp: null, targetSwingTimeframe: 'manual', targetSwingEndTimestamp: null, targetSwingEndTimeframe: 'manual' } };
  if (role === 'target3') return { entryPlan: { targetExternal: null, targetExternalTimestamp: null, targetExternalTimeframe: 'manual', targetExternalEndTimestamp: null, targetExternalEndTimeframe: 'manual' } };
  if (role === 'targetExternal2') return { entryPlan: { targetExternal2: null, targetExternal2Timestamp: null, targetExternal2Timeframe: 'manual', targetExternal2EndTimestamp: null, targetExternal2EndTimeframe: 'manual' } };
  if (role === 'finalTarget') return { entryPlan: { finalTarget: null, finalTargetTimestamp: null, finalTargetTimeframe: 'manual', finalTargetEndTimestamp: null, finalTargetEndTimeframe: 'manual' } };
  return null;
}

function deleteOrderSetupElement(setupId, element) {
  const order = getOrderReviewById(setupId);
  const patch = getOrderSetupElementDeletePatch(element);
  if (!order || !patch) return false;
  recordHistory('Delete Order Setup Element', () => updateOrderReview(setupId, patch));
  clearOrderSetupElementSelection();
  return true;
}

function deleteOrderSetup(setupId) {
  const order = getOrderReviewById(setupId);
  if (!order) return false;
  const deleted = deleteOrderReview(setupId);
  clearOrderSetupElementSelection();
  return deleted;
}

function setOrderSetupHidden(setupId, hidden) {
  const order = getOrderReviewById(setupId);
  if (!order) return false;
  updateOrderReview(setupId, {
    display: {
      ...(order.display || {}),
      hidden,
    },
  });
  return true;
}


function getContextPrice(price) {
  const parsed = Number(price);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMagnetCandidate(context, price, high, low) {
  const priceToCoordinate = context.priceToCoordinate;
  if (typeof priceToCoordinate !== 'function') return null;
  const y = priceToCoordinate(price);
  const highY = priceToCoordinate(high);
  const lowY = priceToCoordinate(low);
  if (y === null || y === undefined || highY === null || highY === undefined || lowY === null || lowY === undefined) {
    return null;
  }
  const highDistance = Math.abs(Number(y) - Number(highY));
  const lowDistance = Math.abs(Number(y) - Number(lowY));
  const nearest = highDistance <= lowDistance
    ? { price: high, label: 'High', distance: highDistance }
    : { price: low, label: 'Low', distance: lowDistance };
  return nearest.distance <= ORDER_ELEMENT_MAGNET_TOLERANCE_PX ? nearest : null;
}

export function getValidBarAnchor(context = {}, label = 'Order element', options = {}) {
  const allowFreePrice = Boolean(options.allowFreePrice);
  const price = getContextPrice(context.price);
  const high = Number(context.bar?.high);
  const low = Number(context.bar?.low);
  if (!context.bar || price === null || !Number.isFinite(high) || !Number.isFinite(low)) {
    bus.emit('status:update', {
      text: `${label} 必须锚定在某根 K 线的有效 high/low 范围内或靠近 high/low`,
      isError: true,
    });
    return null;
  }
  if (price < low || price > high) {
    const magnet = getMagnetCandidate(context, price, high, low);
    if (!magnet && !allowFreePrice) {
      bus.emit('status:update', {
        text: `${label} 必须锚定在 K 线 high/low 范围内，或靠近 high/low 以自动吸附`,
        isError: true,
      });
      return null;
    }
    if (!magnet && allowFreePrice) {
      return {
        timestamp: context.bar.timestamp,
        timeframe: context.timeframe,
        price,
        freePrice: true,
      };
    }
    bus.emit('status:update', {
      text: `${label} snapped to ${magnet.label} ${magnet.price.toFixed(2)}`,
      isError: false,
    });
    return {
      timestamp: context.bar.timestamp,
      timeframe: context.timeframe,
      price: magnet.price,
      magnet: magnet.label,
    };
  }
  return {
    timestamp: context.bar.timestamp,
    timeframe: context.timeframe,
    price,
  };
}

function promptManualEventField(label, fallback = '') {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return fallback;
  const value = window.prompt(label, fallback);
  return value === null ? null : String(value).trim();
}

function getManualEventPromptValues() {
  const eventType = promptManualEventField('Manual explanation type', ORDER_EVENT_TYPES.OTHER);
  if (eventType === null) return null;
  const note = promptManualEventField('Manual explanation note', '');
  if (note === null) return null;
  return {
    eventType: eventType || ORDER_EVENT_TYPES.OTHER,
    note,
  };
}

export function renderOrderSetupMenuItems({ bar, pdaHit, segmentHit, segmentGroupHit, orderSetupHit, isShift = false } = {}) {
  const active = getActiveReviewSet();
  const disabled = bar ? '' : 'disabled';
  const activeDisabled = active ? '' : 'disabled';
  const pdaDisabled = active && pdaHit ? '' : 'disabled';
  const segmentDisabled = active && segmentHit ? '' : 'disabled';
  const compositeDisabled = active && segmentGroupHit ? '' : 'disabled';
  const smtDisabled = active && getSmtRecords().length ? '' : 'disabled';

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

function createOrderSetupFromContext(direction, context) {
  return recordHistory(`Create ${direction === ORDER_DIRECTIONS.LONG ? 'Bullish' : 'Bearish'} Setup`, () => {
    const reviewSet = createChartReviewSet({
      bar: context.bar,
      price: getContextPrice(context.price),
      direction,
      timeframe: context.timeframe,
      eventType: ORDER_EVENT_TYPES.OTHER,
    });
    bus.emit('status:update', {
      text: reviewSet ? `Active Order Setup created: ${reviewSet.id}` : 'Order Setup 创建失败：没有可用 K 线',
      isError: !reviewSet,
    });
  });
}

function patchActiveSetupFromContext(action, context) {
  const actionConfig = ORDER_SETUP_PATCH_ACTIONS[action];
  if (!actionConfig) return false;
  if (!context.bar) return;

  const needsAnchor = actionConfig.anchor === 'strict' || actionConfig.anchor === 'target';
  const anchor = needsAnchor
    ? getValidBarAnchor(context, 'Order Setup element', { allowFreePrice: actionConfig.anchor === 'target' })
    : null;
  if (needsAnchor && !anchor) return;
  const price = anchor?.price ?? getContextPrice(context.price);
  const endTimestamp = context.bar.timestamp;
  const endTimeframe = context.timeframe;

  return recordHistory('Update Order Setup', () => {
    const updated = updateActiveReviewSet(actionConfig.patch({
      context,
      anchor,
      price,
      endTimestamp,
      endTimeframe,
    }));
    bus.emit('status:update', {
      text: updated ? 'Active Order Setup updated from chart' : 'Active Order Setup update failed',
      isError: !updated,
    });
    return updated;
  });
}

function linkContextObjectToActiveSetup(action, context) {
  const actionConfig = ORDER_SETUP_LINK_ACTIONS[action];
  if (!actionConfig) return false;
  return recordHistory('Link Object To Setup', () => {
    const target = actionConfig.getTarget(context);
    if (!target) {
      bus.emit('status:update', { text: 'No linkable object for active setup', isError: true });
      return null;
    }
    const updated = linkRefToActiveReviewSet(actionConfig.buildRef(target));
    bus.emit('status:update', {
      text: updated ? actionConfig.label(target) : 'Object link failed',
      isError: !updated,
    });
    return updated;
  });
}

function addManualExplanationEventToActiveSetup(context = {}) {
  if (!context.bar) return;
  const active = getActiveReviewSet();
  if (!active?.orderReview) return;
  const promptValues = getManualEventPromptValues();
  if (!promptValues) {
    bus.emit('status:update', { text: 'Manual explanation event cancelled', isError: false });
    return;
  }
  const existingEvents = Array.isArray(active.orderReview.setupThesis?.manualEvents)
    ? active.orderReview.setupThesis.manualEvents
    : [];
  const event = {
    timestamp: context.bar.timestamp,
    timeframe: context.timeframe,
    eventType: promptValues.eventType,
    price: getContextPrice(context.price),
    note: promptValues.note,
  };
  return recordHistory('Add Manual Explanation Event', () => {
    const updated = updateActiveReviewSet({
      setupThesis: {
        manualEvents: [...existingEvents, event],
      },
    });
    bus.emit('status:update', {
      text: updated ? 'Manual explanation event added to active setup' : 'Manual explanation event add failed',
      isError: !updated,
    });
  });
}

export function handleOrderSetupChartAction(action, context = {}) {
  if (action === 'order-setup-hit-set-active') {
    const next = setActiveReviewSet(context.orderSetupId);
    bus.emit('status:update', {
      text: next ? `Active Order Setup: ${context.orderSetupId}` : 'Order Setup cannot be activated',
      isError: !next,
    });
    return true;
  }

  if (action === 'order-setup-hit-hide') {
    const hidden = recordHistory('Hide Order Setup', () => setOrderSetupHidden(context.orderSetupId, true));
    bus.emit('status:update', {
      text: hidden ? `Order Setup hidden: ${context.orderSetupId}` : 'Order Setup cannot be hidden',
      isError: !hidden,
    });
    return true;
  }

  if (action === 'order-setup-hit-delete-setup') {
    const deleted = recordHistory('Delete Order Setup', () => deleteOrderSetup(context.orderSetupId));
    bus.emit('status:update', {
      text: deleted ? `Order Setup deleted: ${context.orderSetupId}` : 'Order Setup cannot be deleted',
      isError: !deleted,
    });
    return true;
  }

  if (action === 'order-setup-hit-select-element') {
    const selection = selectOrderSetupElement(context.orderSetupId, context.orderSetupElement);
    bus.emit('status:update', {
      text: selection ? `Selected ${getOrderSetupElementLabel(context.orderSetupElement)}` : 'Order Setup element cannot be selected',
      isError: !selection,
    });
    return true;
  }

  if (action === 'order-setup-hit-delete-element') {
    const deleted = deleteOrderSetupElement(context.orderSetupId, context.orderSetupElement);
    bus.emit('status:update', {
      text: deleted ? `${getOrderSetupElementLabel(context.orderSetupElement)} deleted` : 'Order Setup element cannot be deleted',
      isError: !deleted,
    });
    return true;
  }

  if (action === 'order-setup-hit-clear-active') {
    clearActiveReviewSet();
    bus.emit('status:update', { text: 'Active Order Setup closed', isError: false });
    return true;
  }

  if (action === 'order-setup-create-bullish' || action === 'order-setup-create-bearish') {
    createOrderSetupFromContext(
      action === 'order-setup-create-bullish' ? ORDER_DIRECTIONS.LONG : ORDER_DIRECTIONS.SHORT,
      context
    );
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(ORDER_SETUP_PATCH_ACTIONS, action)) {
    patchActiveSetupFromContext(action, context);
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(ORDER_SETUP_LINK_ACTIONS, action)) {
    linkContextObjectToActiveSetup(action, context);
    return true;
  }

  if (action === 'order-setup-add-manual-event') {
    addManualExplanationEventToActiveSetup(context);
    return true;
  }

  return false;
}
