// Chart context-menu actions for creating and editing the active Order Setup.

import * as bus from '../event-bus.js';
import { getAnnotationById } from '../pda/pda-store.js';
import { getPdaType } from '../pda/pda-types.js';
import { getSegmentById } from '../segment/segment-store.js';
import { getSmtRecords } from '../smt/smt-store.js';
import {
  createChartReviewSet,
  getActiveReviewSet,
  linkRefToActiveReviewSet,
  updateActiveReviewSet,
} from './order-review-active.js';
import {
  ORDER_DIRECTIONS,
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
} from './order-review-store.js';

function getPdaLabel(annotation) {
  if (!annotation) return 'PDA';
  return getPdaType(annotation.type)?.label || annotation.type?.toUpperCase() || 'PDA';
}

function getSegmentLabel(segment) {
  if (!segment) return 'Segment';
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  return `${segment.timeframe || '1H'} ${direction} LEG`;
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

function getContextPrice(price) {
  const parsed = Number(price);
  return Number.isFinite(parsed) ? parsed : null;
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

export function renderOrderSetupMenuItems({ bar, pdaHit, segmentHit, segmentGroupHit } = {}) {
  const active = getActiveReviewSet();
  const disabled = bar ? '' : 'disabled';
  const activeDisabled = active ? '' : 'disabled';
  const pdaDisabled = active && pdaHit ? '' : 'disabled';
  const segmentDisabled = active && segmentHit ? '' : 'disabled';
  const compositeDisabled = active && segmentGroupHit ? '' : 'disabled';
  const smtDisabled = active && getSmtRecords().length ? '' : 'disabled';

  return `
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
}

function patchActiveSetupFromContext(action, context) {
  const price = getContextPrice(context.price);
  if (!context.bar) return;

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
        entryTimestamp: context.bar.timestamp,
        entryTimeframe: context.timeframe,
        entryPrice: price,
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
    updateActiveReviewSet({ entryPlan: { stopLoss: price } });
  } else if (action === 'order-setup-set-target-internal') {
    updateActiveReviewSet({ entryPlan: { targetInternal: price, selectedTargetType: 'internal' } });
  } else if (action === 'order-setup-set-target-swing') {
    updateActiveReviewSet({ entryPlan: { targetSwing: price, selectedTargetType: 'swing' } });
  } else if (action === 'order-setup-set-target-external') {
    updateActiveReviewSet({ entryPlan: { targetExternal: price, selectedTargetType: 'external' } });
  } else if (action === 'order-setup-set-final-target') {
    updateActiveReviewSet({ entryPlan: { finalTarget: price } });
  }

  bus.emit('status:update', { text: 'Active Order Setup updated from chart', isError: false });
}

function linkContextObjectToActiveSetup(action, context) {
  if (action === 'order-setup-link-pda') {
    const annotation = context.pdaHit ? getAnnotationById(context.pdaHit.id) : null;
    if (annotation) {
      linkRefToActiveReviewSet({
        type: ORDER_REF_TYPES.PDA,
        id: annotation.id,
        role: ORDER_REF_ROLES.CONTEXT,
      });
      bus.emit('status:update', { text: `${getPdaLabel(annotation)} linked to active setup`, isError: false });
    }
  } else if (action === 'order-setup-link-segment') {
    const segment = context.segmentHit ? getSegmentById(context.segmentHit.id) : null;
    if (segment) {
      linkRefToActiveReviewSet({
        type: ORDER_REF_TYPES.SEGMENT,
        id: segment.id,
        role: ORDER_REF_ROLES.CONTEXT,
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
  const updated = updateActiveReviewSet({
    setupThesis: {
      manualEvents: [...existingEvents, event],
    },
  });
  bus.emit('status:update', {
    text: updated ? 'Manual explanation event added to active setup' : 'Manual explanation event add failed',
    isError: !updated,
  });
}

export function handleOrderSetupChartAction(action, context = {}) {
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
