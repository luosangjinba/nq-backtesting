// Order Review store foundation. MVP starts with configurable definitions.

import * as bus from '../event-bus.js';

export const ORDER_REVIEW_VERSION = 1;
export const DEFAULT_ORDER_INSTRUMENT = 'NQ';

let orderReviews = [];

function keyFromValue(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function valuesFromDefinitions(definitions) {
  return Object.fromEntries(definitions.map((definition) => [keyFromValue(definition.value), definition.value]));
}

function validSetFromDefinitions(definitions) {
  return new Set(definitions.map((definition) => definition.value));
}

function aliasMapFromDefinitions(definitions) {
  return new Map(
    definitions.flatMap((definition) =>
      (definition.aliases || []).map((alias) => [alias, definition.value])
    )
  );
}

export function getActiveDefinitions(definitions) {
  return definitions.filter((definition) => definition.active !== false);
}

export const ORDER_EVENT_TYPE_DEFINITIONS = [
  {
    value: 'sweep-liquidity',
    label: 'Sweep Liquidity',
    group: 'liquidity',
    active: true,
    aliases: ['liquidity-sweep'],
    description: 'Sweep BSL/SSL/EQH/EQL or comparable liquidity.',
  },
  {
    value: 'touch-fvg',
    label: 'Touch FVG',
    group: 'pda',
    active: true,
    aliases: ['fvg-touch'],
    description: 'Touch an FVG without requiring a full respect judgment.',
  },
  {
    value: 'respect-fvg',
    label: 'Respect FVG',
    group: 'pda',
    active: true,
    aliases: ['fvg-respect'],
    description: 'React from an FVG in a way the reviewer considers valid.',
  },
  {
    value: 'touch-nwog',
    label: 'Touch NWOG',
    group: 'objective-gap',
    active: true,
    aliases: ['nwog-touch'],
    description: 'Touch or react from NWOG.',
  },
  {
    value: 'touch-ndog',
    label: 'Touch NDOG',
    group: 'objective-gap',
    active: true,
    aliases: ['ndog-touch'],
    description: 'Touch or react from NDOG.',
  },
  {
    value: 'wick-ce',
    label: 'Wick CE',
    group: 'pda',
    active: true,
    aliases: [],
    description: 'React from a Wick CE PDA.',
  },
  {
    value: 'ob',
    label: 'OB',
    group: 'pda',
    active: true,
    aliases: ['order-block'],
    description: 'React from an order block range.',
  },
  {
    value: 'breaker',
    label: 'Breaker',
    group: 'pda',
    active: true,
    aliases: [],
    description: 'React from a breaker range.',
  },
  {
    value: 'smt',
    label: 'SMT',
    group: 'smt',
    active: true,
    aliases: [],
    description: 'SMT evidence is the primary trigger.',
  },
  {
    value: 'other',
    label: 'Other',
    group: 'manual',
    active: true,
    aliases: [],
    description: 'Manual thesis outside the current event list.',
  },
];

export const ORDER_REF_TYPE_DEFINITIONS = [
  { value: 'segment', label: 'Segment', active: true, aliases: ['market-segment'] },
  { value: 'composite', label: 'Composite Move', active: true, aliases: ['segment-group', 'composite-move'] },
  { value: 'pda', label: 'PDA', active: true, aliases: ['annotation'] },
  { value: 'smt', label: 'SMT', active: true, aliases: ['smt-record'] },
  { value: 'reactionEvidence', label: 'Reaction Evidence', active: true, aliases: ['reaction-evidence'] },
];

export const ORDER_REF_ROLE_DEFINITIONS = [
  { value: 'trigger', label: 'Trigger', active: true, aliases: [] },
  { value: 'context', label: 'Context', active: true, aliases: [] },
  { value: 'confirmation', label: 'Confirmation', active: true, aliases: [] },
  { value: 'target', label: 'Target', active: true, aliases: [] },
  { value: 'invalidation', label: 'Invalidation', active: true, aliases: [] },
  { value: 'evidence', label: 'Evidence', active: true, aliases: [] },
];

export const ORDER_DIRECTION_DEFINITIONS = [
  { value: 'long', label: 'Long', active: true, aliases: ['buy'] },
  { value: 'short', label: 'Short', active: true, aliases: ['sell'] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_ENTRY_MODEL_DEFINITIONS = [
  { value: 'ob', label: 'OB', group: 'pda', active: true, aliases: ['order-block'] },
  { value: 'fvg', label: 'FVG', group: 'pda', active: true, aliases: [] },
  { value: 'ote', label: 'OTE', group: 'retracement', active: true, aliases: [] },
  { value: 'ote-ob', label: 'OTE + OB', group: 'retracement', active: true, aliases: ['ote+ob'] },
  { value: 'sweep', label: 'Sweep', group: 'liquidity', active: true, aliases: [] },
  { value: 'breaker', label: 'Breaker', group: 'pda', active: true, aliases: [] },
  { value: 'manual', label: 'Manual', group: 'manual', active: true, aliases: [] },
];

export const ORDER_TIMEFRAME_DEFINITIONS = [
  { value: '1M', label: '1M', active: true, aliases: ['1m'] },
  { value: '5M', label: '5M', active: true, aliases: ['5m'] },
  { value: '15M', label: '15M', active: true, aliases: ['15m'] },
  { value: '30M', label: '30M', active: true, aliases: ['30m'] },
  { value: '1H', label: '1H', active: true, aliases: ['60M', '60m', '1h'] },
  { value: '4H', label: '4H', active: true, aliases: ['240M', '240m', '4h'] },
  { value: 'D', label: 'D', active: true, aliases: ['1D', '1d', 'daily'] },
  { value: 'manual', label: 'Manual', active: true, aliases: [] },
];

export const ORDER_TARGET_TYPE_DEFINITIONS = [
  { value: 'internal', label: 'Internal', active: true, aliases: [] },
  { value: 'swing', label: 'Swing', active: true, aliases: [] },
  { value: 'external', label: 'External', active: true, aliases: [] },
  { value: 'custom', label: 'Custom', active: true, aliases: [] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_STOP_REASON_DEFINITIONS = [
  { value: 'beyond-swing', label: 'Beyond Swing', active: true, aliases: ['swing'] },
  { value: 'beyond-liquidity', label: 'Beyond Liquidity', active: true, aliases: ['liquidity'] },
  { value: 'beyond-fvg', label: 'Beyond FVG', active: true, aliases: ['fvg'] },
  { value: 'beyond-ob', label: 'Beyond OB', active: true, aliases: ['ob'] },
  { value: 'fixed-points', label: 'Fixed Points', active: true, aliases: ['fixed'] },
  { value: 'manual', label: 'Manual', active: true, aliases: [] },
];

export const ORDER_TARGET_REACHED_DEFINITIONS = [
  { value: 'yes', label: 'Yes', active: true, aliases: [] },
  { value: 'no', label: 'No', active: true, aliases: [] },
  { value: 'partial', label: 'Partial', active: true, aliases: [] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_RESULT_DEFINITIONS = [
  { value: 'win', label: 'Win', active: true, aliases: [] },
  { value: 'loss', label: 'Loss', active: true, aliases: [] },
  { value: 'breakeven', label: 'Breakeven', active: true, aliases: ['break-even', 'be'] },
  { value: 'missed', label: 'Missed', active: true, aliases: [] },
  { value: 'skipped', label: 'Skipped', active: true, aliases: [] },
  { value: 'invalidated', label: 'Invalidated', active: true, aliases: [] },
  { value: 'managed-out', label: 'Managed Out', active: true, aliases: ['managed'] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_EXIT_REASON_DEFINITIONS = [
  { value: 'target-hit', label: 'Target Hit', active: true, aliases: ['target'] },
  { value: 'stop-hit', label: 'Stop Hit', active: true, aliases: ['stop'] },
  { value: 'manual-close', label: 'Manual Close', active: true, aliases: ['manual'] },
  { value: 'time-exit', label: 'Time Exit', active: true, aliases: ['time'] },
  { value: 'model-invalidated', label: 'Model Invalidated', active: true, aliases: ['invalidated'] },
  { value: 'missed-entry', label: 'Missed Entry', active: true, aliases: ['missed'] },
  { value: 'skipped', label: 'Skipped', active: true, aliases: [] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_CONFIDENCE_DEFINITIONS = [
  { value: 'A', label: 'A', active: true, aliases: ['a'] },
  { value: 'B', label: 'B', active: true, aliases: ['b'] },
  { value: 'C', label: 'C', active: true, aliases: ['c'] },
  { value: 'review-only', label: 'Review Only', active: true, aliases: ['review'] },
];

export const ORDER_EVENT_TYPES = valuesFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS);
export const ORDER_REF_TYPES = valuesFromDefinitions(ORDER_REF_TYPE_DEFINITIONS);
export const ORDER_REF_ROLES = valuesFromDefinitions(ORDER_REF_ROLE_DEFINITIONS);
export const ORDER_DIRECTIONS = valuesFromDefinitions(ORDER_DIRECTION_DEFINITIONS);
export const ORDER_ENTRY_MODELS = valuesFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS);
export const ORDER_TIMEFRAMES = valuesFromDefinitions(ORDER_TIMEFRAME_DEFINITIONS);
export const ORDER_TARGET_TYPES = valuesFromDefinitions(ORDER_TARGET_TYPE_DEFINITIONS);
export const ORDER_STOP_REASONS = valuesFromDefinitions(ORDER_STOP_REASON_DEFINITIONS);
export const ORDER_TARGET_REACHED = valuesFromDefinitions(ORDER_TARGET_REACHED_DEFINITIONS);
export const ORDER_RESULTS = valuesFromDefinitions(ORDER_RESULT_DEFINITIONS);
export const ORDER_EXIT_REASONS = valuesFromDefinitions(ORDER_EXIT_REASON_DEFINITIONS);
export const ORDER_CONFIDENCE = valuesFromDefinitions(ORDER_CONFIDENCE_DEFINITIONS);

export const VALID_ORDER_EVENT_TYPES = validSetFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS);
export const VALID_ORDER_REF_TYPES = validSetFromDefinitions(ORDER_REF_TYPE_DEFINITIONS);
export const VALID_ORDER_REF_ROLES = validSetFromDefinitions(ORDER_REF_ROLE_DEFINITIONS);
export const VALID_ORDER_DIRECTIONS = validSetFromDefinitions(ORDER_DIRECTION_DEFINITIONS);
export const VALID_ORDER_ENTRY_MODELS = validSetFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS);
export const VALID_ORDER_TIMEFRAMES = validSetFromDefinitions(ORDER_TIMEFRAME_DEFINITIONS);
export const VALID_ORDER_TARGET_TYPES = validSetFromDefinitions(ORDER_TARGET_TYPE_DEFINITIONS);
export const VALID_ORDER_STOP_REASONS = validSetFromDefinitions(ORDER_STOP_REASON_DEFINITIONS);
export const VALID_ORDER_TARGET_REACHED = validSetFromDefinitions(ORDER_TARGET_REACHED_DEFINITIONS);
export const VALID_ORDER_RESULTS = validSetFromDefinitions(ORDER_RESULT_DEFINITIONS);
export const VALID_ORDER_EXIT_REASONS = validSetFromDefinitions(ORDER_EXIT_REASON_DEFINITIONS);
export const VALID_ORDER_CONFIDENCE = validSetFromDefinitions(ORDER_CONFIDENCE_DEFINITIONS);

export const ORDER_EVENT_TYPE_ALIASES = aliasMapFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS);
export const ORDER_REF_TYPE_ALIASES = aliasMapFromDefinitions(ORDER_REF_TYPE_DEFINITIONS);
export const ORDER_REF_ROLE_ALIASES = aliasMapFromDefinitions(ORDER_REF_ROLE_DEFINITIONS);
export const ORDER_DIRECTION_ALIASES = aliasMapFromDefinitions(ORDER_DIRECTION_DEFINITIONS);
export const ORDER_ENTRY_MODEL_ALIASES = aliasMapFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS);
export const ORDER_TIMEFRAME_ALIASES = aliasMapFromDefinitions(ORDER_TIMEFRAME_DEFINITIONS);
export const ORDER_TARGET_TYPE_ALIASES = aliasMapFromDefinitions(ORDER_TARGET_TYPE_DEFINITIONS);
export const ORDER_STOP_REASON_ALIASES = aliasMapFromDefinitions(ORDER_STOP_REASON_DEFINITIONS);
export const ORDER_TARGET_REACHED_ALIASES = aliasMapFromDefinitions(ORDER_TARGET_REACHED_DEFINITIONS);
export const ORDER_RESULT_ALIASES = aliasMapFromDefinitions(ORDER_RESULT_DEFINITIONS);
export const ORDER_EXIT_REASON_ALIASES = aliasMapFromDefinitions(ORDER_EXIT_REASON_DEFINITIONS);
export const ORDER_CONFIDENCE_ALIASES = aliasMapFromDefinitions(ORDER_CONFIDENCE_DEFINITIONS);

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
    },
    entryPlan: { ...order.entryPlan },
    resultReview: { ...order.resultReview },
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
  };
}

export function normalizeLinkedObjectRefs(input = []) {
  const refs = Array.isArray(input)
    ? input.map(normalizeLinkedObjectRef).filter(Boolean)
    : [];
  return uniqueBy(refs, (ref) => `${ref.type}:${ref.id}:${ref.role}`);
}

export function normalizeSetupThesis(input = {}) {
  const primaryEventTimeframe = normalizeEnum(
    input.primaryEventTimeframe,
    VALID_ORDER_TIMEFRAMES,
    ORDER_TIMEFRAME_ALIASES,
    ORDER_TIMEFRAMES.MANUAL
  );
  const derivedLowTimeframeWarning = isLowTimeframe(primaryEventTimeframe);

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
    linkedObjectRefs: normalizeLinkedObjectRefs(input.linkedObjectRefs),
    higherTimeframeJustification: normalizeNote(input.higherTimeframeJustification),
    lowTimeframeWarning:
      input.lowTimeframeWarning === undefined || input.lowTimeframeWarning === null
        ? derivedLowTimeframeWarning
        : normalizeBoolean(input.lowTimeframeWarning, derivedLowTimeframeWarning),
    narrative: normalizeNote(input.narrative),
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
    entryTimeframe: normalizeEnum(
      input.entryTimeframe,
      VALID_ORDER_TIMEFRAMES,
      ORDER_TIMEFRAME_ALIASES,
      ORDER_TIMEFRAMES.MANUAL
    ),
    stopLoss,
    stopReason: normalizeEnum(
      input.stopReason,
      VALID_ORDER_STOP_REASONS,
      ORDER_STOP_REASON_ALIASES,
      ORDER_STOP_REASONS.MANUAL
    ),
    targetInternal: normalizeNumber(input.targetInternal),
    targetSwing: normalizeNumber(input.targetSwing),
    targetExternal: normalizeNumber(input.targetExternal),
    selectedTargetType: normalizeEnum(
      input.selectedTargetType,
      VALID_ORDER_TARGET_TYPES,
      ORDER_TARGET_TYPE_ALIASES,
      ORDER_TARGET_TYPES.SWING
    ),
    finalTarget: normalizeNumber(input.finalTarget),
    riskPoints: deriveRiskPoints(entryPrice, stopLoss),
    note: normalizeNote(input.note),
  };
}

function deriveOutcomePoints(entryPlan = {}, exitPrice = null) {
  const entryPrice = normalizeNumber(entryPlan.entryPrice);
  if (entryPrice === null || exitPrice === null) return null;
  if (entryPlan.direction === ORDER_DIRECTIONS.LONG) return exitPrice - entryPrice;
  if (entryPlan.direction === ORDER_DIRECTIONS.SHORT) return entryPrice - exitPrice;
  return null;
}

function deriveOutcomeR(outcomePoints = null, entryPlan = {}) {
  const riskPoints = normalizeNumber(entryPlan.riskPoints);
  if (outcomePoints === null || riskPoints === null || riskPoints <= 0) return null;
  return outcomePoints / riskPoints;
}

export function normalizeResultReview(input = {}, entryPlan = {}) {
  const exitPrice = normalizeNumber(input.exitPrice);
  const outcomePoints = deriveOutcomePoints(entryPlan, exitPrice);

  return {
    expectedTargetReached: normalizeEnum(
      input.expectedTargetReached,
      VALID_ORDER_TARGET_REACHED,
      ORDER_TARGET_REACHED_ALIASES,
      ORDER_TARGET_REACHED.UNKNOWN
    ),
    finalTargetReached: normalizeEnum(
      input.finalTargetReached,
      VALID_ORDER_TARGET_REACHED,
      ORDER_TARGET_REACHED_ALIASES,
      ORDER_TARGET_REACHED.UNKNOWN
    ),
    exitTimestamp: normalizeTimestamp(input.exitTimestamp),
    exitPrice,
    result: normalizeEnum(
      input.result,
      VALID_ORDER_RESULTS,
      ORDER_RESULT_ALIASES,
      ORDER_RESULTS.UNKNOWN
    ),
    exitReason: normalizeEnum(
      input.exitReason,
      VALID_ORDER_EXIT_REASONS,
      ORDER_EXIT_REASON_ALIASES,
      ORDER_EXIT_REASONS.UNKNOWN
    ),
    outcomePoints,
    outcomeR: deriveOutcomeR(outcomePoints, entryPlan),
    note: normalizeNote(input.note),
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
    updatedAt: now,
    setupThesis,
    entryPlan,
    resultReview,
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
