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
  ORDER_DIRECTIONS,
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
  getOrderReviewById,
  updateOrderReview,
} from './order-review-store.js';
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
      return `<button class="pda-menu-item" data-pda-action="order-setup-hit-set-active" data-order-setup-id="${hit.setupId}">${label}</button>`;
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
  if (role === 'stopLoss') return 'Stop Loss';
  if (role === 'target1') return 'Target1';
  if (role === 'target2') return 'Target2';
  if (role === 'target3') return 'Target3';
  if (role === 'finalTarget') return 'Final Target';
  if (role === 'reversal') return 'Reversal';
  return role || 'Element';
}

function getOrderSetupElementDeletePatch(role) {
  if (role === 'entry') return { entryPlan: { entryTimestamp: null, entryPrice: null, entryEndTimestamp: null, entryEndTimeframe: 'manual' } };
  if (role === 'stopLoss') return { entryPlan: { stopLoss: null, stopLossTimestamp: null, stopLossTimeframe: 'manual', stopLossEndTimestamp: null, stopLossEndTimeframe: 'manual' } };
  if (role === 'target1') return { entryPlan: { targetInternal: null, targetInternalTimestamp: null, targetInternalTimeframe: 'manual', targetInternalEndTimestamp: null, targetInternalEndTimeframe: 'manual' } };
  if (role === 'target2') return { entryPlan: { targetSwing: null, targetSwingTimestamp: null, targetSwingTimeframe: 'manual', targetSwingEndTimestamp: null, targetSwingEndTimeframe: 'manual' } };
  if (role === 'target3') return { entryPlan: { targetExternal: null, targetExternalTimestamp: null, targetExternalTimeframe: 'manual', targetExternalEndTimestamp: null, targetExternalEndTimeframe: 'manual' } };
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

export function getValidBarAnchor(context = {}, label = 'Order element') {
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
    if (!magnet) {
      bus.emit('status:update', {
        text: `${label} 必须锚定在 K 线 high/low 范围内，或靠近 high/low 以自动吸附`,
        isError: true,
      });
      return null;
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
        <button class="pda-menu-item" data-pda-action="order-setup-set-reversal" ${activeDisabled || disabled}>Set Reversal Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-entry" ${activeDisabled || disabled}>Set Entry Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-stop-loss" ${activeDisabled || disabled}>Set Stop Loss Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-target-internal" ${activeDisabled || disabled}>Set Target1 Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-target-swing" ${activeDisabled || disabled}>Set Target2 Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-target-external" ${activeDisabled || disabled}>Set Target3 Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-final-target" ${activeDisabled || disabled}>Set Final Target Here</button>
        ${isShift ? `
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="order-setup-set-entry-end" ${activeDisabled || disabled}>Set Entry End Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-stop-loss-end" ${activeDisabled || disabled}>Set Stop Loss End Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-target-internal-end" ${activeDisabled || disabled}>Set Target1 End Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-target-swing-end" ${activeDisabled || disabled}>Set Target2 End Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-target-external-end" ${activeDisabled || disabled}>Set Target3 End Here</button>
        <button class="pda-menu-item" data-pda-action="order-setup-set-final-target-end" ${activeDisabled || disabled}>Set Final Target End Here</button>
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
  if (!context.bar) return;

  const needsValidAnchor = [
    'order-setup-set-entry',
    'order-setup-set-stop-loss',
    'order-setup-set-target-internal',
    'order-setup-set-target-swing',
    'order-setup-set-target-external',
    'order-setup-set-final-target',
  ].includes(action);
  const anchor = needsValidAnchor ? getValidBarAnchor(context, 'Order Setup element') : null;
  if (needsValidAnchor && !anchor) return;
  const price = anchor?.price ?? getContextPrice(context.price);
  const endTimestamp = context.bar.timestamp;
  const endTimeframe = context.timeframe;

  return recordHistory('Update Order Setup', () => {
    if (action === 'order-setup-set-reversal' || action === 'order-setup-set-event') {
      updateActiveReviewSet({
        setupThesis: {
          primaryEventTimestamp: context.bar.timestamp,
          primaryEventTimeframe: context.timeframe,
          primaryEventPrice: price,
        },
      });
    } else if (action === 'order-setup-set-entry') {
      updateActiveReviewSet({
        entryPlan: {
          entryTimestamp: anchor.timestamp,
          entryTimeframe: anchor.timeframe,
          entryPrice: anchor.price,
          entryEndTimestamp: null,
          entryEndTimeframe: 'manual',
        },
      });
    } else if (action === 'order-setup-set-entry-end') {
      updateActiveReviewSet({
        entryPlan: {
          entryEndTimestamp: endTimestamp,
          entryEndTimeframe: endTimeframe,
        },
      });
    } else if (action === 'order-setup-set-entry-time') {
      updateActiveReviewSet({
        entryPlan: {
          entryTimestamp: context.bar.timestamp,
          entryTimeframe: context.timeframe,
        },
      });
    } else if (action === 'order-setup-set-exit-time') {
      updateActiveReviewSet({
        resultReview: {
          exitTimestamp: context.bar.timestamp,
        },
      });
    } else if (action === 'order-setup-set-entry-price') {
      updateActiveReviewSet({ entryPlan: { entryPrice: price } });
    } else if (action === 'order-setup-set-stop-loss') {
      updateActiveReviewSet({
        entryPlan: {
          stopLoss: anchor.price,
          stopLossTimestamp: anchor.timestamp,
          stopLossTimeframe: anchor.timeframe,
          stopLossEndTimestamp: null,
          stopLossEndTimeframe: 'manual',
        },
      });
    } else if (action === 'order-setup-set-stop-loss-end') {
      updateActiveReviewSet({
        entryPlan: {
          stopLossEndTimestamp: endTimestamp,
          stopLossEndTimeframe: endTimeframe,
        },
      });
    } else if (action === 'order-setup-set-target-internal') {
      updateActiveReviewSet({
        entryPlan: {
          targetInternal: anchor.price,
          targetInternalTimestamp: anchor.timestamp,
          targetInternalTimeframe: anchor.timeframe,
          targetInternalEndTimestamp: null,
          targetInternalEndTimeframe: 'manual',
          selectedTargetType: 'internal',
        },
      });
    } else if (action === 'order-setup-set-target-internal-end') {
      updateActiveReviewSet({
        entryPlan: {
          targetInternalEndTimestamp: endTimestamp,
          targetInternalEndTimeframe: endTimeframe,
        },
      });
    } else if (action === 'order-setup-set-target-swing') {
      updateActiveReviewSet({
        entryPlan: {
          targetSwing: anchor.price,
          targetSwingTimestamp: anchor.timestamp,
          targetSwingTimeframe: anchor.timeframe,
          targetSwingEndTimestamp: null,
          targetSwingEndTimeframe: 'manual',
          selectedTargetType: 'swing',
        },
      });
    } else if (action === 'order-setup-set-target-swing-end') {
      updateActiveReviewSet({
        entryPlan: {
          targetSwingEndTimestamp: endTimestamp,
          targetSwingEndTimeframe: endTimeframe,
        },
      });
    } else if (action === 'order-setup-set-target-external') {
      updateActiveReviewSet({
        entryPlan: {
          targetExternal: anchor.price,
          targetExternalTimestamp: anchor.timestamp,
          targetExternalTimeframe: anchor.timeframe,
          targetExternalEndTimestamp: null,
          targetExternalEndTimeframe: 'manual',
          selectedTargetType: 'external',
        },
      });
    } else if (action === 'order-setup-set-target-external-end') {
      updateActiveReviewSet({
        entryPlan: {
          targetExternalEndTimestamp: endTimestamp,
          targetExternalEndTimeframe: endTimeframe,
        },
      });
    } else if (action === 'order-setup-set-final-target') {
      updateActiveReviewSet({
        entryPlan: {
          finalTarget: anchor.price,
          finalTargetTimestamp: anchor.timestamp,
          finalTargetTimeframe: anchor.timeframe,
          finalTargetEndTimestamp: null,
          finalTargetEndTimeframe: 'manual',
        },
      });
    } else if (action === 'order-setup-set-final-target-end') {
      updateActiveReviewSet({
        entryPlan: {
          finalTargetEndTimestamp: endTimestamp,
          finalTargetEndTimeframe: endTimeframe,
        },
      });
    }

    bus.emit('status:update', { text: 'Active Order Setup updated from chart', isError: false });
  });
}

function linkContextObjectToActiveSetup(action, context) {
  return recordHistory('Link Object To Setup', () => {
    if (action === 'order-setup-link-pda') {
    const annotation = context.pdaHit ? getAnnotationById(context.pdaHit.id) : null;
    if (annotation) {
      linkRefToActiveReviewSet({
        type: ORDER_REF_TYPES.PDA,
        id: annotation.id,
        role: ORDER_REF_ROLES.CONTEXT,
        ...buildPdaOrderRefMetadata(annotation),
      });
      bus.emit('status:update', { text: `${getPdaOrderRefLabel(annotation)} linked to active setup`, isError: false });
    }
    } else if (action === 'order-setup-link-segment') {
    const segment = context.segmentHit ? getSegmentById(context.segmentHit.id) : null;
    if (segment) {
      linkRefToActiveReviewSet({
        type: ORDER_REF_TYPES.SEGMENT,
        id: segment.id,
        role: ORDER_REF_ROLES.CONTEXT,
        ...buildSegmentOrderRefMetadata(segment),
      });
      bus.emit('status:update', { text: `${getSegmentLabel(segment)} linked to active setup`, isError: false });
    }
    } else if (action === 'order-setup-link-composite') {
    if (context.segmentGroupHit?.id) {
      linkRefToActiveReviewSet({
        type: ORDER_REF_TYPES.COMPOSITE,
        id: context.segmentGroupHit.id,
        role: ORDER_REF_ROLES.CONTEXT,
      });
      bus.emit('status:update', { text: 'Composite linked to active setup', isError: false });
    }
    } else if (action === 'order-setup-link-latest-smt') {
    const smt = getSmtRecords().at(-1);
    if (smt) {
      linkRefToActiveReviewSet({
        type: ORDER_REF_TYPES.SMT,
        id: smt.id,
        role: ORDER_REF_ROLES.CONFIRMATION,
      });
      bus.emit('status:update', { text: 'Latest SMT linked to active setup', isError: false });
    }
    }
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

  if (action.startsWith('order-setup-set-')) {
    patchActiveSetupFromContext(action, context);
    return true;
  }

  if (action.startsWith('order-setup-link-')) {
    linkContextObjectToActiveSetup(action, context);
    return true;
  }

  if (action === 'order-setup-add-manual-event') {
    addManualExplanationEventToActiveSetup(context);
    return true;
  }

  return false;
}
