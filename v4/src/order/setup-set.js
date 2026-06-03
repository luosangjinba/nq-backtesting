// Setup Set tree adapter over the existing OrderReview store.
// Phase 8G keeps orderReviews as storage and derives the richer tree here.
//
// Boundary:
// - orderReviews is the compatibility storage schema used by localStorage,
//   Review JSON, undo/redo snapshots, and old imports.
// - Setup Set is the runtime/view-model shape consumed by renderers, hit-tests,
//   Calendar, and Inspector summaries.
// Derived fields in this file are display facts only; writes must still go
// through order-review-store with explicit persisted fields.

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
  // Notes live in several persisted sections for compatibility. Setup Set
  // presents them as one explanation list without changing where they are saved.
  const reasonNotes = Array.isArray(order.setupThesis?.reasons)
    ? order.setupThesis.reasons
        .filter((reason) => reason.note)
        .map((reason, index) => ({ scope: `setup-reason-${index + 1}`, text: reason.note }))
    : [];
  return [
    order.setupThesis?.higherTimeframeJustification
      ? { scope: 'setup-htf', text: order.setupThesis.higherTimeframeJustification }
      : null,
    !reasonNotes.length && order.setupThesis?.narrative
      ? { scope: 'setup-narrative', text: order.setupThesis.narrative }
      : null,
    ...reasonNotes,
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
  const display = order.display || {};
  const timestamp = toTimestamp(entry.entryTimestamp);
  const price = toNumberOrNull(entry.entryPrice);
  return {
    type: SETUP_ELEMENT_TYPES.ENTRY,
    role: 'entry',
    timestamp,
    timeframe: entry.entryTimeframe || '',
    endTimestamp: toTimestamp(entry.entryEndTimestamp),
    endTimeframe: entry.entryEndTimeframe || '',
    price,
    lineLengthBars: toNumberOrNull(display.elementLengths?.entry),
    model: entry.entryModel || '',
    direction: entry.direction || 'unknown',
    complete: timestamp !== null && price !== null,
  };
}

function createStopLossElement(order = {}) {
  const entry = order.entryPlan || {};
  const display = order.display || {};
  const price = toNumberOrNull(entry.stopLoss);
  return {
    type: SETUP_ELEMENT_TYPES.STOP_LOSS,
    role: 'stopLoss',
    timestamp: toTimestamp(entry.stopLossTimestamp),
    timeframe: entry.stopLossTimeframe || '',
    endTimestamp: toTimestamp(entry.stopLossEndTimestamp),
    endTimeframe: entry.stopLossEndTimeframe || '',
    price,
    lineLengthBars: toNumberOrNull(display.elementLengths?.stopLoss),
    reason: entry.stopReason || '',
    complete: price !== null,
  };
}

function createTargets(order = {}) {
  const entry = order.entryPlan || {};
  const display = order.display || {};
  return [
    {
      role: 'target1',
      targetType: 'internal',
      timestamp: toTimestamp(entry.targetInternalTimestamp),
      timeframe: entry.targetInternalTimeframe || '',
      endTimestamp: toTimestamp(entry.targetInternalEndTimestamp),
      endTimeframe: entry.targetInternalEndTimeframe || '',
      price: toNumberOrNull(entry.targetInternal),
      lineLengthBars: toNumberOrNull(display.elementLengths?.target1),
    },
    {
      role: 'target2',
      targetType: 'swing',
      timestamp: toTimestamp(entry.targetSwingTimestamp),
      timeframe: entry.targetSwingTimeframe || '',
      endTimestamp: toTimestamp(entry.targetSwingEndTimestamp),
      endTimeframe: entry.targetSwingEndTimeframe || '',
      price: toNumberOrNull(entry.targetSwing),
      lineLengthBars: toNumberOrNull(display.elementLengths?.target2),
    },
    {
      role: 'target3',
      targetType: 'external',
      timestamp: toTimestamp(entry.targetExternalTimestamp),
      timeframe: entry.targetExternalTimeframe || '',
      endTimestamp: toTimestamp(entry.targetExternalEndTimestamp),
      endTimeframe: entry.targetExternalEndTimeframe || '',
      price: toNumberOrNull(entry.targetExternal),
      lineLengthBars: toNumberOrNull(display.elementLengths?.target3),
    },
    {
      role: 'finalTarget',
      targetType: entry.selectedTargetType || '',
      timestamp: toTimestamp(entry.finalTargetTimestamp),
      timeframe: entry.finalTargetTimeframe || '',
      endTimestamp: toTimestamp(entry.finalTargetEndTimestamp),
      endTimeframe: entry.finalTargetEndTimeframe || '',
      price: toNumberOrNull(entry.finalTarget),
      lineLengthBars: toNumberOrNull(display.elementLengths?.finalTarget),
    },
  ]
    .filter((target) => target.price !== null)
    .map((target) => ({
      type: SETUP_ELEMENT_TYPES.TARGET,
      ...target,
      complete: true,
    }));
}

function deriveResultExit(status, entryElement, stopLossElement, targetElements = []) {
  // Result status determines the review exit price when it points to a known
  // target/stop/BE element. This is a derived display value; it is not written
  // back over resultReview.exitPrice.
  if (status === 'target1' || status === 'target2' || status === 'target3') {
    const target = targetElements.find((item) => item.role === status);
    return target?.price ?? null;
  }
  if (status === 'stop-loss') return stopLossElement?.price ?? null;
  if (status === 'breakeven') return entryElement?.price ?? null;
  return null;
}

function deriveResultPoints(exitPrice, entryElement) {
  // Points and R are calculated from the Setup Set tree so the Inspector and
  // chart agree. Persisted orderReviews intentionally keep only explicit user
  // inputs and result status.
  const entryPrice = toNumberOrNull(entryElement?.price);
  const parsedExit = toNumberOrNull(exitPrice);
  if (entryPrice === null || parsedExit === null) return null;
  if (entryElement?.direction === 'long') return parsedExit - entryPrice;
  if (entryElement?.direction === 'short') return entryPrice - parsedExit;
  return null;
}

function deriveResultR(points, entryElement, stopLossElement) {
  const entryPrice = toNumberOrNull(entryElement?.price);
  const stopPrice = toNumberOrNull(stopLossElement?.price);
  const parsedPoints = toNumberOrNull(points);
  if (entryPrice === null || stopPrice === null || parsedPoints === null) return null;
  const risk = Math.abs(entryPrice - stopPrice);
  return risk > 0 ? parsedPoints / risk : null;
}

function deriveHoldingSeconds(exitTimestamp, entryElement) {
  const entryTimestamp = toTimestamp(entryElement?.timestamp);
  const parsedExit = toTimestamp(exitTimestamp);
  if (entryTimestamp === null || parsedExit === null || parsedExit < entryTimestamp) return null;
  return parsedExit - entryTimestamp;
}

function formatHoldingDuration(seconds) {
  const parsed = toNumberOrNull(seconds);
  if (parsed === null || parsed < 0) return null;
  let remaining = Math.floor(parsed);
  const days = Math.floor(remaining / 86400);
  remaining %= 86400;
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;
  const minutes = Math.floor(remaining / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function createResultElement(order = {}, orderElements = {}) {
  const result = order.resultReview || {};
  const timestamp = toTimestamp(result.exitTimestamp);
  const status = result.result || 'unknown';
  const derivedPrice = deriveResultExit(status, orderElements.entry, orderElements.stopLoss, orderElements.targets);
  const price = derivedPrice ?? toNumberOrNull(result.exitPrice);
  const outcomePoints = deriveResultPoints(price, orderElements.entry);
  const holdingSeconds = deriveHoldingSeconds(timestamp, orderElements.entry);
  return {
    type: SETUP_ELEMENT_TYPES.RESULT,
    timestamp,
    price,
    status,
    outcomePoints,
    outcomeR: deriveResultR(outcomePoints, orderElements.entry, orderElements.stopLoss),
    holdingSeconds,
    holdingDuration: formatHoldingDuration(holdingSeconds),
    complete: timestamp !== null || price !== null || result.result !== 'unknown',
  };
}

function createExplanationRefs(order = {}) {
  // Newer data stores refs under setupThesis.reasons[].refs so evidence can be
  // grouped by reason. Older data stores setupThesis.linkedObjectRefs. The
  // adapter exposes one refs list while preserving both storage shapes.
  const reasonRefs = Array.isArray(order.setupThesis?.reasons)
    ? order.setupThesis.reasons.flatMap((reason, reasonIndex) =>
        Array.isArray(reason.refs)
          ? reason.refs.map((ref) => ({ ...ref, reasonId: reason.id || `reason_${reasonIndex + 1}` }))
          : []
      )
    : [];
  const refs = reasonRefs.length
    ? reasonRefs
    : Array.isArray(order.setupThesis?.linkedObjectRefs)
      ? order.setupThesis.linkedObjectRefs
      : [];
  return refs.map((ref) => ({
    type: EXPLANATION_ELEMENT_TYPES.REF,
    refType: ref.type || '',
    refId: ref.id || '',
    role: ref.role || 'context',
    note: ref.note || '',
    sourceChartId: ref.sourceChartId || '',
    sourceChartLabel: ref.sourceChartLabel || '',
    sourceInstrument: ref.sourceInstrument || '',
    sourceTimeframe: ref.sourceTimeframe ?? null,
    sourceTimeframeLabel: ref.sourceTimeframeLabel || '',
    sourceContext: ref.sourceContext || '',
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
  // This is the only conversion point from the flat OrderReview record to the
  // tree used by display code. Keep schema fallback here instead of making
  // renderers and panels parse raw orderReview fields independently.
  if (!order?.id) return null;
  const orderElements = {
    reversal: createReversalElement(order),
    entry: createEntryElement(order),
    stopLoss: createStopLossElement(order),
    targets: createTargets(order),
  };
  orderElements.result = createResultElement(order, orderElements);
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
    orderReview: order,
    instrument: normalizeString(order.instrument, 'NQ'),
    direction: orderElements.entry.direction,
    primaryTimestamp,
    range,
    orderElements,
    explanationElements,
    display: {
      ...(order.display || {}),
    },
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
