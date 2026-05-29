// Review Set adapter over the existing OrderReview store.
// Phase 8F keeps orderReviews as storage and exposes chart-facing set semantics here.

import { getOrderReviewById, getOrderReviews } from './order-review-store.js';

export const REVIEW_SET_TYPES = Object.freeze({
  ORDER_SETUP: 'order-setup',
});

export const REVIEW_SET_SOURCE_TYPES = Object.freeze({
  ORDER_REVIEW: 'order-review',
});

function toTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function collectTimestamps(values = []) {
  return values.map(toTimestamp).filter((value) => value !== null);
}

function titleCase(value, fallback = '') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPrimaryTimestampFromOrder(order) {
  return toTimestamp(
    order?.entryPlan?.entryTimestamp ??
    order?.setupThesis?.primaryEventTimestamp ??
    order?.resultReview?.exitTimestamp ??
    null
  );
}

function getOrderTimestampRange(order) {
  const timestamps = collectTimestamps([
    order?.setupThesis?.primaryEventTimestamp,
    order?.entryPlan?.entryTimestamp,
    order?.resultReview?.exitTimestamp,
  ]);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

function normalizeRefs(order) {
  return Array.isArray(order?.setupThesis?.linkedObjectRefs)
    ? order.setupThesis.linkedObjectRefs.map((ref) => ({ ...ref }))
    : [];
}

function normalizeTargets(entryPlan = {}) {
  return [
    { role: 'internal', price: toNumberOrNull(entryPlan.targetInternal), type: 'internal' },
    { role: 'swing', price: toNumberOrNull(entryPlan.targetSwing), type: 'swing' },
    { role: 'external', price: toNumberOrNull(entryPlan.targetExternal), type: 'external' },
    { role: 'finalTarget', price: toNumberOrNull(entryPlan.finalTarget), type: entryPlan.selectedTargetType || '' },
  ].filter((target) => target.price !== null);
}

function buildSummary(order, primaryTimestamp) {
  const direction = titleCase(order?.entryPlan?.direction || order?.direction, 'Setup');
  const eventType = titleCase(order?.setupThesis?.primaryEventType, '');
  const timeframe = order?.setupThesis?.primaryEventTimeframe || order?.entryPlan?.entryTimeframe || '';
  const result = titleCase(order?.resultReview?.result, '');
  return [direction, eventType, timeframe, primaryTimestamp ? String(primaryTimestamp) : '', result]
    .filter(Boolean)
    .join(' · ');
}

export function createReviewSetFromOrderReview(order) {
  if (!order?.id) return null;
  const setupThesis = order.setupThesis || {};
  const entryPlan = order.entryPlan || {};
  const resultReview = order.resultReview || {};
  const primaryTimestamp = getPrimaryTimestampFromOrder(order);
  const range = getOrderTimestampRange(order);

  return {
    id: order.id,
    type: REVIEW_SET_TYPES.ORDER_SETUP,
    sourceType: REVIEW_SET_SOURCE_TYPES.ORDER_REVIEW,
    sourceId: order.id,
    orderReview: order,
    instrument: order.instrument || '',
    direction: entryPlan.direction || order.direction || 'unknown',
    primaryTimestamp,
    range,
    label: 'Order Setup',
    summary: buildSummary(order, primaryTimestamp),
    setupEvent: {
      timestamp: toTimestamp(setupThesis.primaryEventTimestamp),
      timeframe: setupThesis.primaryEventTimeframe || '',
      type: setupThesis.primaryEventType || '',
      price: toNumberOrNull(setupThesis.primaryEventPrice),
    },
    entry: {
      timestamp: toTimestamp(entryPlan.entryTimestamp),
      timeframe: entryPlan.entryTimeframe || '',
      price: toNumberOrNull(entryPlan.entryPrice),
      model: entryPlan.entryModel || '',
    },
    risk: {
      stopLoss: toNumberOrNull(entryPlan.stopLoss),
      stopReason: entryPlan.stopReason || '',
    },
    targets: normalizeTargets(entryPlan),
    result: {
      timestamp: toTimestamp(resultReview.exitTimestamp),
      price: toNumberOrNull(resultReview.exitPrice),
      status: resultReview.result || 'unknown',
      expectedTargetReached: resultReview.expectedTargetReached || 'unknown',
      finalTargetReached: resultReview.finalTargetReached || 'unknown',
    },
    refs: normalizeRefs(order),
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
  };
}

export function getReviewSets() {
  return getOrderReviews()
    .map(createReviewSetFromOrderReview)
    .filter(Boolean);
}

export function getReviewSetById(id) {
  return createReviewSetFromOrderReview(getOrderReviewById(id));
}

export function getReviewSetTimeRange(reviewSetOrId) {
  const reviewSet = typeof reviewSetOrId === 'string'
    ? getReviewSetById(reviewSetOrId)
    : reviewSetOrId;
  return reviewSet?.range || null;
}

export function locateReviewSet(reviewSetOrId, locateTimestampRange) {
  const range = getReviewSetTimeRange(reviewSetOrId);
  if (!range) return false;
  if (typeof locateTimestampRange === 'function') {
    locateTimestampRange(range.start, range.end);
  }
  return true;
}
