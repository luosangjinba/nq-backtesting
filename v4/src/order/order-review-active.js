import * as bus from '../event-bus.js';
import {
  addOrderReview,
  getOrderReviewById,
  ORDER_DIRECTIONS,
  ORDER_ENTRY_MODELS,
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  updateOrderReview,
} from './order-review-store.js';
import { createReviewSetFromOrderReview, getReviewSetById } from './order-review-set.js';

let activeReviewSetId = null;

function emitChanged() {
  const activeReviewSet = getActiveReviewSet();
  bus.emit('order-review-active:changed', {
    activeReviewSetId,
    activeReviewSet,
    activeOrderReviewId: activeReviewSetId,
    activeOrderReview: activeReviewSet?.orderReview || null,
  });
}

export function getActiveReviewSetId() {
  return activeReviewSetId;
}

export function getActiveReviewSet() {
  return activeReviewSetId ? getReviewSetById(activeReviewSetId) : null;
}

export function setActiveReviewSet(id) {
  if (id && !getReviewSetById(id)) return null;
  activeReviewSetId = id || null;
  emitChanged();
  return getActiveReviewSet();
}

export function clearActiveReviewSet() {
  if (!activeReviewSetId) return;
  activeReviewSetId = null;
  emitChanged();
}

export function createChartReviewSet({
  bar,
  price = null,
  direction = ORDER_DIRECTIONS.UNKNOWN,
  timeframe = 'manual',
  eventType = ORDER_EVENT_TYPES.OTHER,
} = {}) {
  if (!bar) return null;
  const order = addOrderReview({
    source: 'chart',
    setupThesis: {
      primaryEventTimestamp: bar.timestamp,
      primaryEventTimeframe: timeframe,
      primaryEventType: eventType,
      primaryEventPrice: price,
    },
    entryPlan: {
      direction,
      entryTimeframe: timeframe,
      entryModel: ORDER_ENTRY_MODELS.MANUAL,
    },
    display: {
      hidden: false,
    },
  });
  activeReviewSetId = order.id;
  emitChanged();
  return createReviewSetFromOrderReview(order);
}

export function updateActiveReviewSet(patch = {}) {
  if (!activeReviewSetId || !getReviewSetById(activeReviewSetId)) return null;
  const updated = updateOrderReview(activeReviewSetId, patch);
  return updated ? createReviewSetFromOrderReview(updated) : null;
}

export function linkRefToActiveReviewSet({ type, id, role = ORDER_REF_ROLES.CONTEXT, note = '', ...metadata } = {}) {
  const order = getActiveReviewSet()?.orderReview || null;
  if (!order || !type || !id) return null;
  const refs = Array.isArray(order.setupThesis?.linkedObjectRefs) ? order.setupThesis.linkedObjectRefs : [];
  const updated = updateOrderReview(order.id, {
    setupThesis: {
      linkedObjectRefs: [
        ...refs,
        {
          type,
          id,
          role,
          note,
          ...metadata,
        },
      ],
    },
  });
  return updated ? createReviewSetFromOrderReview(updated) : null;
}

export function getActiveOrderReviewId() {
  return getActiveReviewSetId();
}

export function getActiveOrderReview() {
  return getActiveReviewSet()?.orderReview || null;
}

export function setActiveOrderReview(id) {
  const reviewSet = setActiveReviewSet(id);
  return reviewSet?.orderReview || null;
}

export function clearActiveOrderReview() {
  clearActiveReviewSet();
}

export function createChartOrderSetup(options = {}) {
  return createChartReviewSet(options)?.orderReview || null;
}

export function updateActiveOrderReview(patch = {}) {
  return updateActiveReviewSet(patch)?.orderReview || null;
}

export function linkRefToActiveOrderReview(options = {}) {
  return linkRefToActiveReviewSet(options)?.orderReview || null;
}

export function initOrderReviewActive() {
  bus.on('order-review:changed', () => {
    if (activeReviewSetId && !getOrderReviewById(activeReviewSetId)) {
      activeReviewSetId = null;
      emitChanged();
    }
  });
  bus.on('bars:cleared', clearActiveReviewSet);
}
