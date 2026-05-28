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

let activeOrderReviewId = null;

function emitChanged() {
  bus.emit('order-review-active:changed', {
    activeOrderReviewId,
    activeOrderReview: getActiveOrderReview(),
  });
}

export function getActiveOrderReviewId() {
  return activeOrderReviewId;
}

export function getActiveOrderReview() {
  return activeOrderReviewId ? getOrderReviewById(activeOrderReviewId) : null;
}

export function setActiveOrderReview(id) {
  if (id && !getOrderReviewById(id)) return null;
  activeOrderReviewId = id || null;
  emitChanged();
  return getActiveOrderReview();
}

export function clearActiveOrderReview() {
  if (!activeOrderReviewId) return;
  activeOrderReviewId = null;
  emitChanged();
}

export function createChartOrderSetup({
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
  });
  activeOrderReviewId = order.id;
  emitChanged();
  return order;
}

export function updateActiveOrderReview(patch = {}) {
  if (!activeOrderReviewId || !getOrderReviewById(activeOrderReviewId)) return null;
  return updateOrderReview(activeOrderReviewId, patch);
}

export function linkRefToActiveOrderReview({ type, id, role = ORDER_REF_ROLES.CONTEXT, note = '' } = {}) {
  const order = getActiveOrderReview();
  if (!order || !type || !id) return null;
  const refs = Array.isArray(order.setupThesis?.linkedObjectRefs) ? order.setupThesis.linkedObjectRefs : [];
  return updateOrderReview(order.id, {
    setupThesis: {
      linkedObjectRefs: [
        ...refs,
        {
          type,
          id,
          role,
          note,
        },
      ],
    },
  });
}

export function initOrderReviewActive() {
  bus.on('order-review:changed', () => {
    if (activeOrderReviewId && !getOrderReviewById(activeOrderReviewId)) {
      activeOrderReviewId = null;
      emitChanged();
    }
  });
  bus.on('bars:cleared', clearActiveOrderReview);
}
