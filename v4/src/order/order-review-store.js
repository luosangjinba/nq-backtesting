// Order Review store foundation. MVP starts with configurable definitions.

import * as bus from '../event-bus.js';
import {
  ORDER_CONFIDENCE,
  ORDER_CONFIDENCE_ALIASES,
  ORDER_DIRECTIONS,
  ORDER_DIRECTION_ALIASES,
  ORDER_ENTRY_MODELS,
  ORDER_ENTRY_MODEL_ALIASES,
  ORDER_ENTRY_PATTERNS,
  ORDER_ENTRY_PATTERN_ALIASES,
  ORDER_ENTRY_SESSIONS,
  ORDER_ENTRY_SESSION_ALIASES,
  ORDER_EVENT_TYPES,
  ORDER_EVENT_TYPE_ALIASES,
  ORDER_REF_ROLES,
  ORDER_REF_ROLE_ALIASES,
  ORDER_REF_TYPES,
  ORDER_REF_TYPE_ALIASES,
  ORDER_RESULTS,
  ORDER_RESULT_ALIASES,
  ORDER_STOP_REASONS,
  ORDER_STOP_REASON_ALIASES,
  ORDER_TARGET_TYPES,
  ORDER_TARGET_TYPE_ALIASES,
  ORDER_TIMEFRAMES,
  ORDER_TIMEFRAME_ALIASES,
  VALID_ORDER_CONFIDENCE,
  VALID_ORDER_DIRECTIONS,
  VALID_ORDER_ENTRY_MODELS,
  VALID_ORDER_ENTRY_PATTERNS,
  VALID_ORDER_ENTRY_SESSIONS,
  VALID_ORDER_EVENT_TYPES,
  VALID_ORDER_REF_ROLES,
  VALID_ORDER_REF_TYPES,
  VALID_ORDER_RESULTS,
  VALID_ORDER_STOP_REASONS,
  VALID_ORDER_TARGET_TYPES,
  VALID_ORDER_TIMEFRAMES,
} from './order-review-types.js';

export {
  ORDER_CONFIDENCE,
  ORDER_CONFIDENCE_ALIASES,
  ORDER_CONFIDENCE_DEFINITIONS,
  ORDER_DIRECTIONS,
  ORDER_DIRECTION_ALIASES,
  ORDER_DIRECTION_DEFINITIONS,
  ORDER_ENTRY_MODELS,
  ORDER_ENTRY_MODEL_ALIASES,
  ORDER_ENTRY_MODEL_DEFINITIONS,
  ORDER_ENTRY_PATTERNS,
  ORDER_ENTRY_PATTERN_ALIASES,
  ORDER_ENTRY_PATTERN_DEFINITIONS,
  ORDER_ENTRY_SESSIONS,
  ORDER_ENTRY_SESSION_ALIASES,
  ORDER_ENTRY_SESSION_DEFINITIONS,
  ORDER_EVENT_TYPES,
  ORDER_EVENT_TYPE_ALIASES,
  ORDER_EVENT_TYPE_DEFINITIONS,
  ORDER_REF_ROLES,
  ORDER_REF_ROLE_ALIASES,
  ORDER_REF_ROLE_DEFINITIONS,
  ORDER_REF_TYPES,
  ORDER_REF_TYPE_ALIASES,
  ORDER_REF_TYPE_DEFINITIONS,
  ORDER_RESULTS,
  ORDER_RESULT_ALIASES,
  ORDER_RESULT_DEFINITIONS,
  ORDER_STOP_REASONS,
  ORDER_STOP_REASON_ALIASES,
  ORDER_STOP_REASON_DEFINITIONS,
  ORDER_TARGET_TYPES,
  ORDER_TARGET_TYPE_ALIASES,
  ORDER_TARGET_TYPE_DEFINITIONS,
  ORDER_TIMEFRAMES,
  ORDER_TIMEFRAME_ALIASES,
  ORDER_TIMEFRAME_DEFINITIONS,
  VALID_ORDER_CONFIDENCE,
  VALID_ORDER_DIRECTIONS,
  VALID_ORDER_ENTRY_MODELS,
  VALID_ORDER_ENTRY_PATTERNS,
  VALID_ORDER_ENTRY_SESSIONS,
  VALID_ORDER_EVENT_TYPES,
  VALID_ORDER_REF_ROLES,
  VALID_ORDER_REF_TYPES,
  VALID_ORDER_RESULTS,
  VALID_ORDER_STOP_REASONS,
  VALID_ORDER_TARGET_TYPES,
  VALID_ORDER_TIMEFRAMES,
  getActiveDefinitions,
} from './order-review-types.js';

export const ORDER_REVIEW_VERSION = 1;
export const DEFAULT_ORDER_INSTRUMENT = 'NQ';

let orderReviews = [];

export function normalizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

export function normalizeNote(value) {
  return normalizeString(value, '');
}

export function normalizeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeTimestamp(value, fallback = null) {
  const parsed = normalizeNumber(value, fallback);
  return parsed !== null && parsed >= 0 ? Math.floor(parsed) : fallback;
}

export function resolveDefinitionValue(value, validSet, aliasMap, fallback) {
  const normalized = normalizeString(value, '');
  if (!normalized) return fallback;
  if (validSet.has(normalized)) return normalized;
  if (aliasMap?.has(normalized)) return aliasMap.get(normalized);
  return fallback;
}

export function normalizeEnum(value, validSet, aliasMap, fallback) {
  return resolveDefinitionValue(value, validSet, aliasMap, fallback);
}

function normalizeEnumArray(value, validSet, aliasMap) {
  const values = Array.isArray(value) ? value : [value];
  return uniqueBy(
    values
      .map((item) => resolveDefinitionValue(item, validSet, aliasMap, ''))
      .filter(Boolean)
  );
}

export function uniqueBy(items = [], getKey = (item) => item) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const result = [];
  items.forEach((item) => {
    const key = getKey(item);
    if (key === undefined || key === null || key === '' || seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

export function isLowTimeframe(timeframe) {
  const normalized = normalizeEnum(
    timeframe,
    VALID_ORDER_TIMEFRAMES,
    ORDER_TIMEFRAME_ALIASES,
    ''
  );
  return normalized === ORDER_TIMEFRAMES['1M'] || normalized === ORDER_TIMEFRAMES['5M'];
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

function createOrderReviewId(now = Date.now()) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `order_manual_${Math.floor(now)}_${suffix}`;
}

function emitChanged(reason, order = null) {
  bus.emit('order-review:changed', {
    reason,
    order: cloneOrderReview(order),
    orderReviews: getOrderReviews(),
  });
}

function cloneOrderReview(order) {
  if (!order) return null;
  return {
    ...order,
    setupThesis: {
      ...order.setupThesis,
      linkedObjectRefs: Array.isArray(order.setupThesis?.linkedObjectRefs)
        ? order.setupThesis.linkedObjectRefs.map((ref) => ({ ...ref }))
        : [],
      reasons: Array.isArray(order.setupThesis?.reasons)
        ? order.setupThesis.reasons.map((reason) => ({
            ...reason,
            refs: Array.isArray(reason.refs) ? reason.refs.map((ref) => ({ ...ref })) : [],
          }))
        : [],
      manualEvents: Array.isArray(order.setupThesis?.manualEvents)
        ? order.setupThesis.manualEvents.map((event) => ({ ...event }))
        : [],
    },
    entryPlan: { ...order.entryPlan },
    resultReview: { ...order.resultReview },
    display: {
      ...(order.display || {}),
      elementLengths: { ...(order.display?.elementLengths || {}) },
      elementVisibility: { ...(order.display?.elementVisibility || {}) },
    },
  };
}

function ensureUniqueOrderReviewId(order, reviews = orderReviews) {
  if (!reviews.some((review) => review.id === order.id)) return order;

  let index = 2;
  let nextId = `${order.id}-${index}`;
  while (reviews.some((review) => review.id === nextId)) {
    index += 1;
    nextId = `${order.id}-${index}`;
  }
  return { ...order, id: nextId };
}

function mergeOrderReviewPatch(existing, patch = {}) {
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safePatch } = patch;

  return {
    ...existing,
    ...safePatch,
    id: existing.id,
    createdAt: existing.createdAt,
    setupThesis: {
      ...(existing.setupThesis || {}),
      ...(safePatch.setupThesis || {}),
    },
    entryPlan: {
      ...(existing.entryPlan || {}),
      ...(safePatch.entryPlan || {}),
    },
    resultReview: {
      ...(existing.resultReview || {}),
      ...(safePatch.resultReview || {}),
    },
    display: {
      ...(existing.display || {}),
      ...(safePatch.display || {}),
    },
  };
}

export function normalizeLinkedObjectRef(input = {}) {
  const type = normalizeEnum(
    input.type,
    VALID_ORDER_REF_TYPES,
    ORDER_REF_TYPE_ALIASES,
    null
  );
  const id = normalizeString(input.id, '');
  if (!type || !id) return null;

  return {
    type,
    id,
    role: normalizeEnum(
      input.role,
      VALID_ORDER_REF_ROLES,
      ORDER_REF_ROLE_ALIASES,
      ORDER_REF_ROLES.CONTEXT
    ),
    note: normalizeNote(input.note),
    sourceChartId: normalizeString(input.sourceChartId, ''),
    sourceChartLabel: normalizeString(input.sourceChartLabel, ''),
    sourceInstrument: normalizeString(input.sourceInstrument, ''),
    sourceTimeframe: input.sourceTimeframe ?? null,
    sourceTimeframeLabel: normalizeString(input.sourceTimeframeLabel, ''),
    sourceContext: normalizeString(input.sourceContext, ''),
  };
}

export function normalizeLinkedObjectRefs(input = []) {
  const refs = Array.isArray(input)
    ? input.map(normalizeLinkedObjectRef).filter(Boolean)
    : [];
  return uniqueBy(refs, (ref) => `${ref.type}:${ref.id}:${ref.role}`);
}

function normalizeSetupReason(input = {}, index = 0) {
  const note = normalizeNote(input.note);
  const refs = normalizeLinkedObjectRefs(input.refs);
  const id = normalizeString(input.id, `reason_${index + 1}`);
  if (!id && !note && !refs.length) return null;
  return {
    id: id || `reason_${index + 1}`,
    note,
    refs,
  };
}

function normalizeSetupReasons(input = [], legacyNarrative = '', legacyRefs = []) {
  const reasons = Array.isArray(input)
    ? input.map(normalizeSetupReason).filter(Boolean)
    : [];
  if (reasons.length) return uniqueBy(reasons, (reason) => reason.id);

  const note = normalizeNote(legacyNarrative);
  const refs = normalizeLinkedObjectRefs(legacyRefs);
  if (!note && !refs.length) return [];
  return [
    {
      id: 'reason_1',
      note,
      refs,
    },
  ];
}

export function normalizeManualExplanationEvent(input = {}, index = 0) {
  const timestamp = normalizeTimestamp(input.timestamp);
  const eventType = normalizeEnum(
    input.eventType ?? input.type,
    VALID_ORDER_EVENT_TYPES,
    ORDER_EVENT_TYPE_ALIASES,
    ORDER_EVENT_TYPES.OTHER
  );
  const timeframe = normalizeEnum(
    input.timeframe,
    VALID_ORDER_TIMEFRAMES,
    ORDER_TIMEFRAME_ALIASES,
    ORDER_TIMEFRAMES.MANUAL
  );
  const id = normalizeString(
    input.id,
    `manual_event_${timestamp ?? 'na'}_${index + 1}`
  );

  if (timestamp === null && !normalizeNote(input.note)) return null;

  return {
    id,
    timestamp,
    timeframe,
    eventType,
    price: normalizeNumber(input.price),
    note: normalizeNote(input.note),
  };
}

export function normalizeManualExplanationEvents(input = []) {
  const events = Array.isArray(input)
    ? input.map(normalizeManualExplanationEvent).filter(Boolean)
    : [];
  return uniqueBy(events, (event) => event.id);
}

export function normalizeSetupThesis(input = {}) {
  const primaryEventTimeframe = normalizeEnum(
    input.primaryEventTimeframe,
    VALID_ORDER_TIMEFRAMES,
    ORDER_TIMEFRAME_ALIASES,
    ORDER_TIMEFRAMES.MANUAL
  );
  const derivedLowTimeframeWarning = isLowTimeframe(primaryEventTimeframe);

  const linkedObjectRefs = normalizeLinkedObjectRefs(input.linkedObjectRefs);
  const narrative = normalizeNote(input.narrative);
  return {
    primaryEventTimestamp: normalizeTimestamp(input.primaryEventTimestamp),
    primaryEventTimeframe,
    primaryEventType: normalizeEnum(
      input.primaryEventType,
      VALID_ORDER_EVENT_TYPES,
      ORDER_EVENT_TYPE_ALIASES,
      ORDER_EVENT_TYPES.OTHER
    ),
    primaryEventPrice: normalizeNumber(input.primaryEventPrice),
    linkedObjectRefs,
    reasons: normalizeSetupReasons(input.reasons, narrative, linkedObjectRefs),
    manualEvents: normalizeManualExplanationEvents(input.manualEvents),
    higherTimeframeJustification: normalizeNote(input.higherTimeframeJustification),
    lowTimeframeWarning:
      input.lowTimeframeWarning === undefined || input.lowTimeframeWarning === null
        ? derivedLowTimeframeWarning
        : normalizeBoolean(input.lowTimeframeWarning, derivedLowTimeframeWarning),
    narrative,
    confidence: normalizeEnum(
      input.confidence,
      VALID_ORDER_CONFIDENCE,
      ORDER_CONFIDENCE_ALIASES,
      ORDER_CONFIDENCE.REVIEW_ONLY
    ),
  };
}

function deriveRiskPoints(entryPrice, stopLoss) {
  if (entryPrice === null || stopLoss === null) return null;
  return Math.abs(entryPrice - stopLoss);
}

export function normalizeEntryPlan(input = {}) {
  const entryPrice = normalizeNumber(input.entryPrice);
  const stopLoss = normalizeNumber(input.stopLoss);

  return {
    direction: normalizeEnum(
      input.direction,
      VALID_ORDER_DIRECTIONS,
      ORDER_DIRECTION_ALIASES,
      ORDER_DIRECTIONS.UNKNOWN
    ),
    entryTimestamp: normalizeTimestamp(input.entryTimestamp),
    entryPrice,
    entryModel: normalizeEnum(
      input.entryModel,
      VALID_ORDER_ENTRY_MODELS,
      ORDER_ENTRY_MODEL_ALIASES,
      ORDER_ENTRY_MODELS.MANUAL
    ),
    entryPatterns: normalizeEnumArray(
      input.entryPatterns,
      VALID_ORDER_ENTRY_PATTERNS,
      ORDER_ENTRY_PATTERN_ALIASES
    ),
    entrySession: normalizeEnum(
      input.entrySession,
      VALID_ORDER_ENTRY_SESSIONS,
      ORDER_ENTRY_SESSION_ALIASES,
      ORDER_ENTRY_SESSIONS.UNKNOWN
    ),
    entryTimeframe: normalizeEnum(
      input.entryTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    entryEndTimestamp: normalizeTimestamp(input.entryEndTimestamp),
    entryEndTimeframe: normalizeEnum(
      input.entryEndTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    stopLoss,
    stopLossTimestamp: normalizeTimestamp(input.stopLossTimestamp),
    stopLossTimeframe: normalizeEnum(
      input.stopLossTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    stopLossEndTimestamp: normalizeTimestamp(input.stopLossEndTimestamp),
    stopLossEndTimeframe: normalizeEnum(
      input.stopLossEndTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    stopReason: normalizeEnum(
      input.stopReason,
      VALID_ORDER_STOP_REASONS,
      ORDER_STOP_REASON_ALIASES,
      ORDER_STOP_REASONS.MANUAL
    ),
    targetInternal: normalizeNumber(input.targetInternal),
    targetInternalTimestamp: normalizeTimestamp(input.targetInternalTimestamp),
    targetInternalTimeframe: normalizeEnum(
      input.targetInternalTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    targetInternalEndTimestamp: normalizeTimestamp(input.targetInternalEndTimestamp),
    targetInternalEndTimeframe: normalizeEnum(
      input.targetInternalEndTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    targetSwing: normalizeNumber(input.targetSwing),
    targetSwingTimestamp: normalizeTimestamp(input.targetSwingTimestamp),
    targetSwingTimeframe: normalizeEnum(
      input.targetSwingTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    targetSwingEndTimestamp: normalizeTimestamp(input.targetSwingEndTimestamp),
    targetSwingEndTimeframe: normalizeEnum(
      input.targetSwingEndTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    targetExternal: normalizeNumber(input.targetExternal),
    targetExternalTimestamp: normalizeTimestamp(input.targetExternalTimestamp),
    targetExternalTimeframe: normalizeEnum(
      input.targetExternalTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    targetExternalEndTimestamp: normalizeTimestamp(input.targetExternalEndTimestamp),
    targetExternalEndTimeframe: normalizeEnum(
      input.targetExternalEndTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    selectedTargetType: normalizeEnum(
      input.selectedTargetType,
      VALID_ORDER_TARGET_TYPES,
      ORDER_TARGET_TYPE_ALIASES,
      ORDER_TARGET_TYPES.SWING
    ),
    finalTarget: normalizeNumber(input.finalTarget),
    finalTargetTimestamp: normalizeTimestamp(input.finalTargetTimestamp),
    finalTargetTimeframe: normalizeEnum(
      input.finalTargetTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    finalTargetEndTimestamp: normalizeTimestamp(input.finalTargetEndTimestamp),
    finalTargetEndTimeframe: normalizeEnum(
      input.finalTargetEndTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    riskPoints: deriveRiskPoints(entryPrice, stopLoss),
    note: normalizeNote(input.note),
  };
}

export function normalizeResultReview(input = {}) {
  const exitPrice = normalizeNumber(input.exitPrice);
  const targetActions = {};
  if (input.targetActions && typeof input.targetActions === 'object') {
    Object.entries(input.targetActions).forEach(([role, value]) => {
      const key = normalizeString(role, '');
      const rawAction = value && typeof value === 'object' ? value.action : value;
      const action = normalizeString(rawAction, '');
      if (key && action) targetActions[key] = { action };
    });
  }

  return {
    exitTimestamp: normalizeTimestamp(input.exitTimestamp),
    exitPrice,
    result: normalizeEnum(
      input.result,
      VALID_ORDER_RESULTS,
      ORDER_RESULT_ALIASES,
      ORDER_RESULTS.UNKNOWN
    ),
    targetActions,
    note: normalizeNote(input.note),
  };
}

export function normalizeOrderDisplay(input = {}) {
  const elementLengths = {};
  const elementVisibility = {};
  if (input.elementLengths && typeof input.elementLengths === 'object') {
    Object.entries(input.elementLengths).forEach(([key, value]) => {
      const role = normalizeString(key, '');
      const length = normalizeNumber(value);
      if (role && length !== null && length >= 0) elementLengths[role] = Math.floor(length);
    });
  }
  if (input.elementVisibility && typeof input.elementVisibility === 'object') {
    Object.entries(input.elementVisibility).forEach(([key, value]) => {
      const role = normalizeString(key, '');
      if (role) elementVisibility[role] = normalizeBoolean(value, true);
    });
  }
  return {
    hidden: normalizeBoolean(input.hidden, false),
    showRiskRewardBox: normalizeBoolean(input.showRiskRewardBox, true),
    elementLengths,
    elementVisibility,
  };
}

export function getOrderReviewIdentity(order = {}) {
  const setupEventTimestamp = normalizeTimestamp(order.setupThesis?.primaryEventTimestamp);
  const entryTimestamp = normalizeTimestamp(order.entryPlan?.entryTimestamp, setupEventTimestamp);
  if (entryTimestamp === null) return null;

  const instrument = normalizeString(order.instrument, DEFAULT_ORDER_INSTRUMENT);
  const direction = normalizeEnum(
    order.entryPlan?.direction,
    VALID_ORDER_DIRECTIONS,
    ORDER_DIRECTION_ALIASES,
    ORDER_DIRECTIONS.UNKNOWN
  );
  const entryModel = normalizeEnum(
    order.entryPlan?.entryModel,
    VALID_ORDER_ENTRY_MODELS,
    ORDER_ENTRY_MODEL_ALIASES,
    ORDER_ENTRY_MODELS.MANUAL
  );

  return [
    instrument,
    setupEventTimestamp ?? '',
    entryTimestamp,
    direction,
    entryModel,
  ].join(':');
}

export function normalizeOrderReview(input = {}, options = {}) {
  const now = normalizeTimestamp(options.now, Date.now());
  const setupThesis = normalizeSetupThesis(input.setupThesis);
  const entryPlan = normalizeEntryPlan(input.entryPlan);
  const resultReview = normalizeResultReview(input.resultReview, entryPlan);
  const id = normalizeString(input.id, createOrderReviewId(now));

  const normalized = {
    id,
    source: normalizeString(input.source, 'manual'),
    instrument: normalizeString(input.instrument, DEFAULT_ORDER_INSTRUMENT),
    version: ORDER_REVIEW_VERSION,
    createdAt: normalizeTimestamp(input.createdAt, now),
    updatedAt: options.preserveUpdatedAt ? normalizeTimestamp(input.updatedAt, now) : now,
    setupThesis,
    entryPlan,
    resultReview,
    display: normalizeOrderDisplay(input.display),
    note: normalizeNote(input.note),
  };

  const importedFromId = normalizeString(input.importedFromId, '');
  if (importedFromId) normalized.importedFromId = importedFromId;

  return normalized;
}

export function addOrderReview(input = {}, options = {}) {
  const normalized = ensureUniqueOrderReviewId(normalizeOrderReview(input, options));
  orderReviews = [...orderReviews, normalized];
  emitChanged('add', normalized);
  return cloneOrderReview(normalized);
}

export function updateOrderReview(id, patch = {}, options = {}) {
  const normalizedId = normalizeString(id, '');
  if (!normalizedId) return null;

  let updated = null;
  orderReviews = orderReviews.map((order) => {
    if (order.id !== normalizedId) return order;
    updated = normalizeOrderReview(mergeOrderReviewPatch(order, patch), options);
    return updated;
  });

  if (updated) emitChanged('update', updated);
  return cloneOrderReview(updated);
}

export function deleteOrderReview(id) {
  const normalizedId = normalizeString(id, '');
  const before = orderReviews.length;
  orderReviews = orderReviews.filter((order) => order.id !== normalizedId);
  const deleted = orderReviews.length !== before;
  if (deleted) emitChanged('delete');
  return deleted;
}

export function loadOrderReviews(nextOrders = [], options = {}) {
  const normalizedOrders = [];
  if (Array.isArray(nextOrders)) {
    nextOrders.forEach((order) => {
      normalizedOrders.push(
        ensureUniqueOrderReviewId(
          normalizeOrderReview(order, options),
          normalizedOrders
        )
      );
    });
  }
  orderReviews = normalizedOrders;
  emitChanged('load');
  return getOrderReviews();
}

export function clearOrderReviews() {
  const hadOrders = orderReviews.length > 0;
  orderReviews = [];
  if (hadOrders) emitChanged('clear');
  return hadOrders;
}

export function getOrderReviews() {
  return orderReviews.map(cloneOrderReview);
}

export function getOrderReviewById(id) {
  const normalizedId = normalizeString(id, '');
  return cloneOrderReview(orderReviews.find((order) => order.id === normalizedId) || null);
}
