import { normalizeMinuteTimeframe } from './time-domain.js';
import { normalizeSessionAwareDisplayTimeframe } from './htf-display-timeframe-domain.js';

export const TARGET_TIMEFRAME_BUCKET_TYPES = Object.freeze({
  FIXED_DURATION: 'fixed-duration',
  SESSION_AWARE: 'session-aware',
});

const FIXED_TARGET_TIMEFRAME_MINUTES = Object.freeze([
  1,
  2,
  3,
  4,
  5,
  10,
  15,
  30,
  60,
  120,
  240,
  480,
  720,
]);

const SESSION_AWARE_TARGET_TIMEFRAME_IDS = Object.freeze(['1D', '1W', '1M']);

const FIXED_ID_BY_MINUTES = new Map([
  [1, '1m'],
  [2, '2m'],
  [3, '3m'],
  [4, '4m'],
  [5, '5m'],
  [10, '10m'],
  [15, '15m'],
  [30, '30m'],
  [60, '1h'],
  [120, '2h'],
  [240, '4h'],
  [480, '8h'],
  [720, '12h'],
]);

const FIXED_MINUTES_BY_ID = new Map(
  Array.from(FIXED_ID_BY_MINUTES.entries()).map(([minutes, id]) => [id, minutes])
);

// Mirrors the target-bars service's canonical fixed-duration bucket grid.
// Most periods are Unix/clock aligned; 4h uses 02/06/10/14/18/22 UTC.
const FIXED_ALIGNMENT_OFFSET_SECONDS_BY_ID = new Map([
  ['4h', 2 * 60 * 60],
]);

const TARGET_TIMEFRAME_RECORDS = Object.freeze([
  ...FIXED_TARGET_TIMEFRAME_MINUTES.map((minutes) => Object.freeze({
    bucketType: TARGET_TIMEFRAME_BUCKET_TYPES.FIXED_DURATION,
    id: FIXED_ID_BY_MINUTES.get(minutes),
    minutes,
    runtimeValue: minutes,
    sourceAuthority: minutes === 1 ? 'source-1m' : 'target-or-source-derived',
  })),
  ...SESSION_AWARE_TARGET_TIMEFRAME_IDS.map((id) => Object.freeze({
    bucketType: TARGET_TIMEFRAME_BUCKET_TYPES.SESSION_AWARE,
    id,
    minutes: null,
    runtimeValue: id,
    sourceAuthority: 'session-calendar',
  })),
]);

const TARGET_TIMEFRAME_BY_ID = new Map(
  TARGET_TIMEFRAME_RECORDS.map((record) => [record.id, record])
);

function cloneRecord(record) {
  return record ? Object.freeze({ ...record }) : null;
}

function normalizeTextId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const sessionAwareDayOrWeek = raw.match(/^1\s*[dDwW]$/)
    ? normalizeSessionAwareDisplayTimeframe(raw)
    : null;
  if (sessionAwareDayOrWeek) return sessionAwareDayOrWeek;

  const fixedMatch = raw.match(/^(\d+)\s*([mMhH])?$/);
  if (!fixedMatch) {
    const sessionAware = normalizeSessionAwareDisplayTimeframe(raw);
    return sessionAware || null;
  }
  const multiplier = Number(fixedMatch[1]);
  const unit = fixedMatch[2] || 'm';
  if (!Number.isInteger(multiplier) || multiplier <= 0) return null;
  if (unit === 'M' && multiplier === 1) return '1M';
  const minutes = unit.toLowerCase() === 'h' ? multiplier * 60 : multiplier;
  return FIXED_ID_BY_MINUTES.get(minutes) || null;
}

export function getSupportedTargetTimeframeIds() {
  return TARGET_TIMEFRAME_RECORDS.map((record) => record.id);
}

export function getTargetTimeframeRecords() {
  return TARGET_TIMEFRAME_RECORDS.map(cloneRecord);
}

export function normalizeTargetTimeframeId(value, {
  fieldName = 'targetTimeframe',
} = {}) {
  const id = typeof value === 'number'
    ? FIXED_ID_BY_MINUTES.get(normalizeMinuteTimeframe(value, {
      allowSuffix: false,
      fieldName,
    }))
    : normalizeTextId(value);
  if (!id || !TARGET_TIMEFRAME_BY_ID.has(id)) {
    throw new Error(`${fieldName} must be a supported target timeframe id.`);
  }
  return id;
}

export function findTargetTimeframeRecord(value) {
  try {
    return cloneRecord(TARGET_TIMEFRAME_BY_ID.get(normalizeTargetTimeframeId(value)));
  } catch {
    return null;
  }
}

export function isTargetTimeframeSupported(value) {
  return findTargetTimeframeRecord(value) !== null;
}

export function isSessionAwareTargetTimeframe(value) {
  return findTargetTimeframeRecord(value)?.bucketType === TARGET_TIMEFRAME_BUCKET_TYPES.SESSION_AWARE;
}

export function isFixedDurationTargetTimeframe(value) {
  return findTargetTimeframeRecord(value)?.bucketType === TARGET_TIMEFRAME_BUCKET_TYPES.FIXED_DURATION;
}

export function targetTimeframeToRuntimeValue(value) {
  return findTargetTimeframeRecord(value)?.runtimeValue ?? null;
}

export function targetTimeframeToApiCacheKey(value) {
  return normalizeTargetTimeframeId(value);
}

export function targetTimeframeToFixedMinutes(value) {
  const record = findTargetTimeframeRecord(value);
  return record?.bucketType === TARGET_TIMEFRAME_BUCKET_TYPES.FIXED_DURATION
    ? record.minutes
    : null;
}

export function targetTimeframeToAlignmentOffsetSeconds(value) {
  const record = findTargetTimeframeRecord(value);
  if (record?.bucketType !== TARGET_TIMEFRAME_BUCKET_TYPES.FIXED_DURATION) return null;
  return FIXED_ALIGNMENT_OFFSET_SECONDS_BY_ID.get(record.id) ?? 0;
}

export function fixedMinutesToTargetTimeframeId(value) {
  const minutes = normalizeMinuteTimeframe(value, {
    allowSuffix: false,
    fieldName: 'fixedTargetTimeframeMinutes',
  });
  return FIXED_ID_BY_MINUTES.get(minutes) || null;
}
