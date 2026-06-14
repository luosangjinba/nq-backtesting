import * as bus from '../event-bus.js';
import {
  DEFAULT_LIVE_RECORD_INSTRUMENT,
  LIVE_RECORD_DIRECTION_ALIASES,
  LIVE_RECORD_DIRECTIONS,
  LIVE_RECORD_REASON_CATEGORIES,
  LIVE_RECORD_REF_ROLES,
  LIVE_RECORD_REF_TYPES,
  LIVE_RECORD_RESULT_ALIASES,
  LIVE_RECORD_RESULT_STATUSES,
  LIVE_RECORD_STATUS_ALIASES,
  LIVE_RECORD_STATUSES,
  LIVE_RECORD_TARGET_ROLES,
  LIVE_RECORD_TARGET_TYPES,
  LIVE_RECORD_TIMEFRAME_ALIASES,
  LIVE_RECORD_TIMEFRAMES,
  LIVE_RECORD_VERSION,
  VALID_LIVE_RECORD_DIRECTIONS,
  VALID_LIVE_RECORD_REASON_CATEGORIES,
  VALID_LIVE_RECORD_REF_ROLES,
  VALID_LIVE_RECORD_REF_TYPES,
  VALID_LIVE_RECORD_RESULT_STATUSES,
  VALID_LIVE_RECORD_STATUSES,
  VALID_LIVE_RECORD_TARGET_ROLES,
  VALID_LIVE_RECORD_TARGET_TYPES,
  VALID_LIVE_RECORD_TIMEFRAMES,
} from './live-record-types.js';

let liveRecords = [];

export function normalizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
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

export function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

export function normalizeEnum(value, validSet, aliasMap, fallback) {
  const normalized = normalizeString(value, '');
  if (!normalized) return fallback;
  if (validSet.has(normalized)) return normalized;
  if (aliasMap?.has(normalized)) return aliasMap.get(normalized);
  return fallback;
}

function createLiveRecordId(now = Date.now()) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `live_record_${Math.floor(now)}_${suffix}`;
}

function cloneRef(ref = {}) {
  return { ...ref };
}

export function cloneLiveRecord(record) {
  if (!record) return null;
  return {
    ...record,
    anchor: { ...(record.anchor || {}) },
    execution: {
      ...(record.execution || {}),
      entry: { ...(record.execution?.entry || {}) },
      marketStructureShift: { ...(record.execution?.marketStructureShift || {}) },
      stopLoss: { ...(record.execution?.stopLoss || {}) },
      targets: Array.isArray(record.execution?.targets)
        ? record.execution.targets.map((target) => ({ ...target }))
        : [],
      orders: Array.isArray(record.execution?.orders)
        ? record.execution.orders.map((order) => ({ ...order }))
        : [],
      fills: Array.isArray(record.execution?.fills)
        ? record.execution.fills.map((fill) => ({ ...fill }))
        : [],
    },
    reasons: Array.isArray(record.reasons)
      ? record.reasons.map((reason) => ({
          ...reason,
          refs: Array.isArray(reason.refs) ? reason.refs.map(cloneRef) : [],
        }))
      : [],
    linkedObjectRefs: Array.isArray(record.linkedObjectRefs)
      ? record.linkedObjectRefs.map(cloneRef)
      : [],
    result: { ...(record.result || {}) },
    display: {
      ...(record.display || {}),
      elementVisibility: { ...(record.display?.elementVisibility || {}) },
    },
  };
}

function emitChanged(reason, record = null) {
  bus.emit('live-record:changed', {
    reason,
    liveRecord: cloneLiveRecord(record),
    liveRecords: getLiveRecords(),
  });
}

function normalizeRef(input = {}) {
  return {
    type: normalizeEnum(
      input.type || input.refType,
      VALID_LIVE_RECORD_REF_TYPES,
      null,
      LIVE_RECORD_REF_TYPES.ORDER_SETUP
    ),
    id: normalizeString(input.id || input.refId, ''),
    role: normalizeEnum(
      input.role,
      VALID_LIVE_RECORD_REF_ROLES,
      null,
      LIVE_RECORD_REF_ROLES.CONTEXT
    ),
    sourceInstrument: normalizeString(input.sourceInstrument, ''),
    sourceTimeframeLabel: normalizeString(input.sourceTimeframeLabel, ''),
    sourceContext: normalizeString(input.sourceContext, ''),
  };
}

function normalizeReason(input = {}, index = 0) {
  return {
    id: normalizeString(input.id, `reason_${index + 1}`),
    category: normalizeEnum(
      input.category,
      VALID_LIVE_RECORD_REASON_CATEGORIES,
      null,
      LIVE_RECORD_REASON_CATEGORIES.OTHER
    ),
    note: normalizeString(input.note, ''),
    refs: Array.isArray(input.refs) ? input.refs.map(normalizeRef).filter((ref) => ref.id) : [],
  };
}

function normalizeAnchor(input = {}) {
  return {
    timestamp: normalizeTimestamp(input.timestamp),
    timeframe: normalizeEnum(
      input.timeframe,
      VALID_LIVE_RECORD_TIMEFRAMES,
      LIVE_RECORD_TIMEFRAME_ALIASES,
      LIVE_RECORD_TIMEFRAMES.MANUAL
    ),
    price: normalizeNumber(input.price),
  };
}

function normalizeExecutionElement(input = {}) {
  return {
    id: normalizeString(input.id, ''),
    role: normalizeString(input.role, ''),
    label: normalizeString(input.label, ''),
    timestamp: normalizeTimestamp(input.timestamp),
    timeframe: normalizeEnum(
      input.timeframe,
      VALID_LIVE_RECORD_TIMEFRAMES,
      LIVE_RECORD_TIMEFRAME_ALIASES,
      LIVE_RECORD_TIMEFRAMES.MANUAL
    ),
    price: normalizeNumber(input.price),
    endTimestamp: normalizeTimestamp(input.endTimestamp),
    endTimeframe: normalizeEnum(
      input.endTimeframe,
      VALID_LIVE_RECORD_TIMEFRAMES,
      LIVE_RECORD_TIMEFRAME_ALIASES,
      LIVE_RECORD_TIMEFRAMES.MANUAL
    ),
    lineLengthBars: normalizeNumber(input.lineLengthBars),
    visible: normalizeBoolean(input.visible, true),
    complete: normalizeBoolean(input.complete, false),
    note: normalizeString(input.note, ''),
  };
}

function normalizeTargetRole(target = {}, index = 0) {
  const defaultRoles = [
    LIVE_RECORD_TARGET_ROLES.INTERNAL_1,
    LIVE_RECORD_TARGET_ROLES.INTERNAL_2,
    LIVE_RECORD_TARGET_ROLES.INTERNAL_3,
    LIVE_RECORD_TARGET_ROLES.SWING_POINT,
    LIVE_RECORD_TARGET_ROLES.EXTERNAL_1,
    LIVE_RECORD_TARGET_ROLES.EXTERNAL_2,
    LIVE_RECORD_TARGET_ROLES.FINAL,
  ];
  return normalizeEnum(
    target.role || target.id,
    VALID_LIVE_RECORD_TARGET_ROLES,
    null,
    defaultRoles[index] || `target_${index + 1}`
  );
}

function normalizeTargetType(target = {}, role = '') {
  if (role === LIVE_RECORD_TARGET_ROLES.SWING_POINT) return LIVE_RECORD_TARGET_TYPES.SWING;
  if (role === LIVE_RECORD_TARGET_ROLES.FINAL) return LIVE_RECORD_TARGET_TYPES.FINAL;
  if (role === LIVE_RECORD_TARGET_ROLES.EXTERNAL_1 || role === LIVE_RECORD_TARGET_ROLES.EXTERNAL_2) {
    return LIVE_RECORD_TARGET_TYPES.EXTERNAL;
  }
  return normalizeEnum(
    target.targetType || target.type,
    VALID_LIVE_RECORD_TARGET_TYPES,
    null,
    LIVE_RECORD_TARGET_TYPES.INTERNAL
  );
}

function defaultTargetLabel(role = '', index = 0) {
  if (role === LIVE_RECORD_TARGET_ROLES.INTERNAL_1) return 'Target Internal 1';
  if (role === LIVE_RECORD_TARGET_ROLES.INTERNAL_2) return 'Target Internal 2';
  if (role === LIVE_RECORD_TARGET_ROLES.INTERNAL_3) return 'Target Internal 3';
  if (role === LIVE_RECORD_TARGET_ROLES.SWING_POINT) return 'Target Swing Point';
  if (role === LIVE_RECORD_TARGET_ROLES.EXTERNAL_1) return 'Target External 1';
  if (role === LIVE_RECORD_TARGET_ROLES.EXTERNAL_2) return 'Target External 2';
  if (role === LIVE_RECORD_TARGET_ROLES.FINAL) return 'Target External 3';
  return `Target ${index + 1}`;
}

function normalizeTarget(input = {}, index = 0) {
  const role = normalizeTargetRole(input, index);
  const targetType = normalizeTargetType(input, role);
  const element = normalizeExecutionElement({
    ...input,
    id: input.id || role,
    role,
    label: input.label || defaultTargetLabel(role, index),
  });
  return {
    ...element,
    role,
    targetType,
  };
}

function normalizeExecution(input = {}) {
  return {
    entry: normalizeExecutionElement(input.entry),
    marketStructureShift: normalizeExecutionElement(input.marketStructureShift),
    stopLoss: normalizeExecutionElement(input.stopLoss),
    targets: Array.isArray(input.targets)
      ? input.targets.map(normalizeTarget)
      : [],
    orders: Array.isArray(input.orders)
      ? input.orders.map((order, index) => ({
          id: normalizeString(order.id, `order_${index + 1}`),
          timestamp: normalizeTimestamp(order.timestamp),
          note: normalizeString(order.note, ''),
        }))
      : [],
    fills: Array.isArray(input.fills)
      ? input.fills.map((fill, index) => ({
          id: normalizeString(fill.id, `fill_${index + 1}`),
          timestamp: normalizeTimestamp(fill.timestamp),
          price: normalizeNumber(fill.price),
          quantity: normalizeNumber(fill.quantity),
          note: normalizeString(fill.note, ''),
        }))
      : [],
  };
}

function normalizeResult(input = {}) {
  return {
    status: normalizeEnum(
      input.status,
      VALID_LIVE_RECORD_RESULT_STATUSES,
      LIVE_RECORD_RESULT_ALIASES,
      LIVE_RECORD_RESULT_STATUSES.UNKNOWN
    ),
    exitTimestamp: normalizeTimestamp(input.exitTimestamp),
    exitTimeframe: normalizeEnum(
      input.exitTimeframe,
      VALID_LIVE_RECORD_TIMEFRAMES,
      LIVE_RECORD_TIMEFRAME_ALIASES,
      LIVE_RECORD_TIMEFRAMES.MANUAL
    ),
    exitPrice: normalizeNumber(input.exitPrice),
    note: normalizeString(input.note, ''),
  };
}

function normalizeDisplay(input = {}) {
  return {
    hidden: normalizeBoolean(input.hidden, false),
    showRiskRewardBox: normalizeBoolean(input.showRiskRewardBox, true),
    elementVisibility: {
      ...(input.elementVisibility || {}),
    },
  };
}

function ensureUniqueLiveRecordId(record, records = liveRecords) {
  if (!records.some((item) => item.id === record.id)) return record;
  let index = 2;
  let nextId = `${record.id}-${index}`;
  while (records.some((item) => item.id === nextId)) {
    index += 1;
    nextId = `${record.id}-${index}`;
  }
  return { ...record, id: nextId };
}

function mergeLiveRecordPatch(existing, patch = {}) {
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safePatch } = patch;
  const existingExecution = existing.execution || {};
  const patchExecution = safePatch.execution || {};
  return {
    ...existing,
    ...safePatch,
    id: existing.id,
    createdAt: existing.createdAt,
    anchor: {
      ...(existing.anchor || {}),
      ...(safePatch.anchor || {}),
    },
    execution: {
      ...existingExecution,
      ...patchExecution,
      entry: {
        ...(existingExecution.entry || {}),
        ...(patchExecution.entry || {}),
      },
      marketStructureShift: {
        ...(existingExecution.marketStructureShift || {}),
        ...(patchExecution.marketStructureShift || {}),
      },
      stopLoss: {
        ...(existingExecution.stopLoss || {}),
        ...(patchExecution.stopLoss || {}),
      },
      targets: Array.isArray(patchExecution.targets)
        ? patchExecution.targets
        : Array.isArray(existingExecution.targets)
          ? existingExecution.targets
          : [],
    },
    result: {
      ...(existing.result || {}),
      ...(safePatch.result || {}),
    },
    display: {
      ...(existing.display || {}),
      ...(safePatch.display || {}),
    },
  };
}

export function normalizeLiveRecord(input = {}, options = {}) {
  const now = options.now || Date.now();
  const createdAt = normalizeTimestamp(input.createdAt, now);
  const updatedAt = normalizeTimestamp(input.updatedAt, now);
  const anchor = normalizeAnchor(input.anchor || {
    timestamp: input.anchorTimestamp,
    timeframe: input.anchorTimeframe,
    price: input.anchorPrice,
  });
  return {
    version: LIVE_RECORD_VERSION,
    id: normalizeString(input.id, createLiveRecordId(now)),
    instrument: normalizeString(input.instrument, DEFAULT_LIVE_RECORD_INSTRUMENT),
    createdAt,
    updatedAt,
    status: normalizeEnum(
      input.status,
      VALID_LIVE_RECORD_STATUSES,
      LIVE_RECORD_STATUS_ALIASES,
      LIVE_RECORD_STATUSES.DRAFT
    ),
    direction: normalizeEnum(
      input.direction,
      VALID_LIVE_RECORD_DIRECTIONS,
      LIVE_RECORD_DIRECTION_ALIASES,
      LIVE_RECORD_DIRECTIONS.UNKNOWN
    ),
    orderSetupId: normalizeString(input.orderSetupId || input.coreId, ''),
    summary: normalizeString(input.summary, ''),
    anchor,
    execution: normalizeExecution(input.execution),
    reasons: Array.isArray(input.reasons)
      ? input.reasons.map(normalizeReason)
      : [normalizeReason()],
    linkedObjectRefs: Array.isArray(input.linkedObjectRefs)
      ? input.linkedObjectRefs.map(normalizeRef).filter((ref) => ref.id)
      : [],
    result: normalizeResult(input.result),
    display: normalizeDisplay(input.display),
  };
}

export function addLiveRecord(input = {}, options = {}) {
  const record = ensureUniqueLiveRecordId(normalizeLiveRecord(input, options));
  liveRecords = [...liveRecords, record];
  emitChanged('add', record);
  return cloneLiveRecord(record);
}

export function updateLiveRecord(id, patch = {}, options = {}) {
  const index = liveRecords.findIndex((record) => record.id === id);
  if (index < 0) return null;
  const updated = normalizeLiveRecord(
    mergeLiveRecordPatch(liveRecords[index], {
      ...patch,
      updatedAt: options.now || Date.now(),
    }),
    { now: options.now || Date.now() }
  );
  liveRecords = [
    ...liveRecords.slice(0, index),
    updated,
    ...liveRecords.slice(index + 1),
  ];
  emitChanged('update', updated);
  return cloneLiveRecord(updated);
}

export function deleteLiveRecord(id) {
  const existing = liveRecords.find((record) => record.id === id);
  if (!existing) return false;
  liveRecords = liveRecords.filter((record) => record.id !== id);
  emitChanged('delete', existing);
  return true;
}

export function loadLiveRecords(records = [], options = {}) {
  const next = [];
  (Array.isArray(records) ? records : []).forEach((record) => {
    next.push(ensureUniqueLiveRecordId(normalizeLiveRecord(record, options), next));
  });
  liveRecords = next;
  emitChanged('load', null);
  return getLiveRecords();
}

export function clearLiveRecords() {
  if (!liveRecords.length) return false;
  liveRecords = [];
  emitChanged('clear', null);
  return true;
}

export function getLiveRecords() {
  return liveRecords.map(cloneLiveRecord);
}

export function getLiveRecordById(id) {
  return cloneLiveRecord(liveRecords.find((record) => record.id === id));
}

export function getLiveRecordsByOrderSetupId(orderSetupId) {
  const setupId = normalizeString(orderSetupId, '');
  if (!setupId) return [];
  return liveRecords
    .filter((record) => record.orderSetupId === setupId)
    .map(cloneLiveRecord);
}
