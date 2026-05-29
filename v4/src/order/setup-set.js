// Setup Set tree adapter over the existing OrderReview store.
// Phase 8G keeps orderReviews as storage and derives the richer tree here.

import { getOrderReviewById, getOrderReviews } from './order-review-store.js';

export const SETUP_SET_SOURCE_TYPES = Object.freeze({
  ORDER_REVIEW: 'order-review',
});

export const SETUP_ELEMENT_TYPES = Object.freeze({
  REVERSAL: 'reversal',
  ENTRY: 'entry',
  STOP_LOSS: 'stopLoss',
  TARGET: 'target',
  RESULT: 'result',
});

export const EXPLANATION_ELEMENT_TYPES = Object.freeze({
  REF: 'ref',
  MANUAL_EVENT: 'manualEvent',
  NOTE: 'note',
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

function normalizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function collectTimestamps(values = []) {
  return values.map(toTimestamp).filter((value) => value !== null);
}

function timestampRangeFromValues(values = []) {
  const timestamps = collectTimestamps(values);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

function compactNotes(order = {}) {
  return [
    order.setupThesis?.higherTimeframeJustification
      ? { scope: 'setup-htf', text: order.setupThesis.higherTimeframeJustification }
      : null,
    order.setupThesis?.narrative
      ? { scope: 'setup-narrative', text: order.setupThesis.narrative }
      : null,
    order.entryPlan?.note
      ? { scope: 'entry', text: order.entryPlan.note }
      : null,
    order.resultReview?.note
      ? { scope: 'result', text: order.resultReview.note }
      : null,
    order.note
      ? { scope: 'order', text: order.note }
      : null,
  ].filter(Boolean);
}

function createReversalElement(order = {}) {
  const setup = order.setupThesis || {};
  const timestamp = toTimestamp(setup.primaryEventTimestamp);
  const price = toNumberOrNull(setup.primaryEventPrice);
  return {
    type: SETUP_ELEMENT_TYPES.REVERSAL,
    timestamp,
    timeframe: setup.primaryEventTimeframe || '',
    eventType: setup.primaryEventType || '',
    price,
    complete: timestamp !== null,
  };
}

function createEntryElement(order = {}) {
  const entry = order.entryPlan || {};
  const timestamp = toTimestamp(entry.entryTimestamp);
  const price = toNumberOrNull(entry.entryPrice);
  return {
    type: SETUP_ELEMENT_TYPES.ENTRY,
    timestamp,
    timeframe: entry.entryTimeframe || '',
    price,
    model: entry.entryModel || '',
    direction: entry.direction || 'unknown',
    complete: timestamp !== null && price !== null,
  };
}

function createStopLossElement(order = {}) {
  const entry = order.entryPlan || {};
  const price = toNumberOrNull(entry.stopLoss);
  return {
    type: SETUP_ELEMENT_TYPES.STOP_LOSS,
    price,
    reason: entry.stopReason || '',
    complete: price !== null,
  };
}

function createTargets(order = {}) {
  const entry = order.entryPlan || {};
  return [
    { role: 'target1', targetType: 'internal', price: toNumberOrNull(entry.targetInternal) },
    { role: 'target2', targetType: 'swing', price: toNumberOrNull(entry.targetSwing) },
    { role: 'target3', targetType: 'external', price: toNumberOrNull(entry.targetExternal) },
    { role: 'finalTarget', targetType: entry.selectedTargetType || '', price: toNumberOrNull(entry.finalTarget) },
  ]
    .filter((target) => target.price !== null)
    .map((target) => ({
      type: SETUP_ELEMENT_TYPES.TARGET,
      ...target,
      complete: true,
    }));
}

function createResultElement(order = {}) {
  const result = order.resultReview || {};
  const timestamp = toTimestamp(result.exitTimestamp);
  const price = toNumberOrNull(result.exitPrice);
  return {
    type: SETUP_ELEMENT_TYPES.RESULT,
    timestamp,
    price,
    status: result.result || 'unknown',
    expectedTargetReached: result.expectedTargetReached || 'unknown',
    finalTargetReached: result.finalTargetReached || 'unknown',
    exitReason: result.exitReason || 'unknown',
    outcomePoints: toNumberOrNull(result.outcomePoints),
    outcomeR: toNumberOrNull(result.outcomeR),
    complete: timestamp !== null || price !== null || result.result !== 'unknown',
  };
}

function createExplanationRefs(order = {}) {
  const refs = Array.isArray(order.setupThesis?.linkedObjectRefs)
    ? order.setupThesis.linkedObjectRefs
    : [];
  return refs.map((ref) => ({
    type: EXPLANATION_ELEMENT_TYPES.REF,
    refType: ref.type || '',
    refId: ref.id || '',
    role: ref.role || 'context',
    note: ref.note || '',
  }));
}

function createManualEvents(order = {}) {
  const manualEvents = Array.isArray(order.setupThesis?.manualEvents)
    ? order.setupThesis.manualEvents
    : [];
  return manualEvents.map((event) => ({
    type: EXPLANATION_ELEMENT_TYPES.MANUAL_EVENT,
    timestamp: toTimestamp(event.timestamp),
    timeframe: event.timeframe || '',
    eventType: event.eventType || event.type || 'other',
    price: toNumberOrNull(event.price),
    note: event.note || '',
  }));
}

function createExplanationNotes(order = {}) {
  return compactNotes(order).map((note) => ({
    type: EXPLANATION_ELEMENT_TYPES.NOTE,
    scope: note.scope,
    text: note.text,
  }));
}

function getPrimaryTimestamp(orderElements = {}) {
  return (
    orderElements.entry?.timestamp ??
    orderElements.reversal?.timestamp ??
    orderElements.result?.timestamp ??
    null
  );
}

function getSetupSetRange(orderElements = {}) {
  return timestampRangeFromValues([
    orderElements.reversal?.timestamp,
    orderElements.entry?.timestamp,
    orderElements.result?.timestamp,
  ]);
}

export function createSetupSetFromOrderReview(order) {
  if (!order?.id) return null;
  const orderElements = {
    reversal: createReversalElement(order),
    entry: createEntryElement(order),
    stopLoss: createStopLossElement(order),
    targets: createTargets(order),
    result: createResultElement(order),
  };
  const explanationElements = {
    refs: createExplanationRefs(order),
    manualEvents: createManualEvents(order),
    notes: createExplanationNotes(order),
  };
  const primaryTimestamp = getPrimaryTimestamp(orderElements);
  const range = getSetupSetRange(orderElements);

  return {
    id: order.id,
    type: 'setup-set',
    sourceType: SETUP_SET_SOURCE_TYPES.ORDER_REVIEW,
    sourceId: order.id,
    sourceOrderReview: order,
    instrument: normalizeString(order.instrument, 'NQ'),
    direction: orderElements.entry.direction,
    primaryTimestamp,
    range,
    orderElements,
    explanationElements,
    metadata: {
      createdAt: order.createdAt || null,
      updatedAt: order.updatedAt || null,
      version: order.version || 1,
      source: order.source || 'manual',
    },
  };
}

export function getSetupSets() {
  return getOrderReviews()
    .map(createSetupSetFromOrderReview)
    .filter(Boolean);
}

export function getSetupSetById(id) {
  return createSetupSetFromOrderReview(getOrderReviewById(id));
}

export function getSetupSetTimeRange(setupSetOrId) {
  const setupSet = typeof setupSetOrId === 'string'
    ? getSetupSetById(setupSetOrId)
    : setupSetOrId;
  return setupSet?.range || null;
}

export function locateSetupSet(setupSetOrId, locateTimestampRange) {
  const range = getSetupSetTimeRange(setupSetOrId);
  if (!range) return false;
  if (typeof locateTimestampRange === 'function') {
    locateTimestampRange(range.start, range.end);
  }
  return true;
}
