import { failCalendarTimeframe } from './calendar-timeframe-error.js';

const PERIODS = new Set(['day', 'week', 'month']);

export function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_VALUE_INVALID', `${label} must be an object.`);
  }
  if (Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_FIELDS_INVALID', `${label} fields must be exact.`);
  }
}

export function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_STRING_INVALID', `${label} must be an exact non-empty string.`);
  }
  return value;
}

export function positiveSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_INTEGER_INVALID', `${label} must be a positive safe integer.`);
  }
  return value;
}

export function requireFunction(value, label) {
  if (typeof value !== 'function') {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_FUNCTION_INVALID', `${label} must be a function.`);
  }
  return value;
}

export function requirePeriod(value) {
  if (!PERIODS.has(value)) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_PERIOD_INVALID', 'period must be day, week, or month.');
  }
  return value;
}

export function requireSessionStartMinute(value) {
  if (!Number.isInteger(value) || value < 0 || value >= 1_440) {
    failCalendarTimeframe(
      'CALENDAR_TIMEFRAME_SESSION_START_INVALID',
      'sessionStartMinute must be an integer inside one wall day.',
    );
  }
  return value;
}
