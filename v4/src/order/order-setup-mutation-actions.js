import * as bus from '../event-bus.js';
import { getAnnotationById } from '../pda/pda-store.js';
import { getSegmentById } from '../segment/segment-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
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
} from './order-review-types.js';
import {
  buildPdaOrderRefMetadata,
  buildSegmentOrderRefMetadata,
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from './order-ref-metadata.js';
import { recordHistory } from '../history/history-manager.js';
import { clearActiveLiveRecord } from '../live-record/live-record-active.js';
import { getCurrentMainSmtRecords } from './order-setup-chart-menu.js';

const ORDER_ELEMENT_MAGNET_TOLERANCE_PX = 10;

function getSegmentLabel(segment) {
  if (!segment) return 'Segment';
  return getSegmentOrderRefLabel(segment);
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
    getTarget: () => getCurrentMainSmtRecords().at(-1) || null,
    buildRef: (smt) => ({
      type: ORDER_REF_TYPES.SMT,
      id: smt.id,
      role: ORDER_REF_ROLES.CONFIRMATION,
    }),
    label: () => 'Latest SMT linked to active setup',
  },
});

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

function createOrderSetupFromContext(direction, context) {
  return recordHistory(`Create ${direction === ORDER_DIRECTIONS.LONG ? 'Bullish' : 'Bearish'} Setup`, () => {
    const reviewSet = createChartReviewSet({
      bar: context.bar,
      price: getContextPrice(context.price),
      direction,
      timeframe: context.timeframe,
      eventType: ORDER_EVENT_TYPES.OTHER,
      sourceChartId: context.sourceChartId || 'primary',
      sourceChartLabel: context.sourceChartLabel || '',
      sourceInstrument: context.sourceInstrument || getPrimaryInstrument(),
      sourceTimeframe: context.sourceTimeframe ?? null,
      sourceTimeframeLabel: context.sourceTimeframeLabel || context.timeframe || '',
      sourceContext: context.sourceContext || '',
    });
    if (reviewSet) clearActiveLiveRecord();
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

export function handleOrderSetupMutationAction(action, context = {}) {
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
