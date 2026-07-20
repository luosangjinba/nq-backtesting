import { failFixedTimeframe } from './fixed-timeframe-error.js';

export function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failFixedTimeframe('FIXED_TIMEFRAME_VALUE_INVALID', `${label} must be an object.`);
  }
  if (Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failFixedTimeframe('FIXED_TIMEFRAME_FIELDS_INVALID', `${label} fields must be exact.`);
  }
}

export function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    failFixedTimeframe('FIXED_TIMEFRAME_STRING_INVALID', `${label} must be an exact non-empty string.`);
  }
  return value;
}

export function nonNegativeSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failFixedTimeframe('FIXED_TIMEFRAME_INTEGER_INVALID', `${label} must be a non-negative safe integer.`);
  }
  return value;
}

export function positiveSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    failFixedTimeframe('FIXED_TIMEFRAME_INTEGER_INVALID', `${label} must be a positive safe integer.`);
  }
  return value;
}

export function normalizeFixedConfiguration(value) {
  const durationMs = positiveSafeInteger(value.durationMs, 'durationMs');
  const sourceDurationMs = positiveSafeInteger(value.sourceDurationMs, 'sourceDurationMs');
  const offsetMs = nonNegativeSafeInteger(value.offsetMs, 'offsetMs');
  if (durationMs < sourceDurationMs || durationMs % sourceDurationMs !== 0) {
    failFixedTimeframe('FIXED_TIMEFRAME_SOURCE_INCOMPATIBLE', 'durationMs must be a source-duration multiple.');
  }
  if (offsetMs >= durationMs || offsetMs % sourceDurationMs !== 0) {
    failFixedTimeframe('FIXED_TIMEFRAME_OFFSET_INVALID', 'offsetMs must be source-aligned and below durationMs.');
  }
  return Object.freeze({ durationMs, offsetMs, sourceDurationMs });
}
