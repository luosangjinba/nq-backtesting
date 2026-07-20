import { failSessionHours } from './session-hours-error.js';
import { exactRecord, nonEmptyString } from './validation.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXCEPTION_KINDS = new Set(['closed', 'early-close', 'late-open', 'source-unavailable']);
export const SESSION_HOURS_CALENDAR_BRAND = Symbol('SessionHoursCalendar');

function isDateLabel(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeIntervals(value, label) {
  if (!Array.isArray(value)) {
    failSessionHours('SESSION_HOURS_INTERVALS_INVALID', `${label} must be an array.`);
  }
  let previousEnd = -1;
  return Object.freeze(value.map((interval) => {
    exactRecord(interval, ['startMinute', 'endMinute'], `${label} interval`);
    if (!Number.isInteger(interval.startMinute) || !Number.isInteger(interval.endMinute)
      || interval.startMinute < 0 || interval.endMinute > 1440
      || interval.startMinute >= interval.endMinute || interval.startMinute < previousEnd) {
      failSessionHours('SESSION_HOURS_INTERVAL_INVALID', `${label} intervals must be ordered and non-overlapping.`);
    }
    previousEnd = interval.endMinute;
    return Object.freeze({ startMinute: interval.startMinute, endMinute: interval.endMinute });
  }));
}

function normalizeWeeklySchedule(value) {
  exactRecord(value, ['eth', 'rth'], 'weeklySchedule');
  return Object.freeze(Object.fromEntries(['eth', 'rth'].map((mode) => {
    if (!Array.isArray(value[mode]) || value[mode].length !== 7) {
      failSessionHours('SESSION_HOURS_WEEK_INVALID', `${mode} must contain Sunday through Saturday.`);
    }
    return [mode, Object.freeze(value[mode].map((day, index) => (
      normalizeIntervals(day, `${mode}[${index}]`)
    )))];
  })));
}

function normalizeSource(value) {
  exactRecord(value, ['retrievedDate', 'url'], 'exception.source');
  if (!isDateLabel(value.retrievedDate) || !URL.canParse(value.url)) {
    failSessionHours('SESSION_HOURS_SOURCE_INVALID', 'Exception source must have a date and URL.');
  }
  return Object.freeze({ retrievedDate: value.retrievedDate, url: value.url });
}

function normalizeException(value, revision) {
  exactRecord(value, ['calendarRevision', 'eligibleIntervals', 'kind', 'source', 'verification', 'wallDate'], 'exception');
  if (value.calendarRevision !== revision) {
    failSessionHours('SESSION_HOURS_EXCEPTION_REVISION_MISMATCH', 'Exception calendar revision does not match.');
  }
  if (!isDateLabel(value.wallDate) || !EXCEPTION_KINDS.has(value.kind)) {
    failSessionHours('SESSION_HOURS_EXCEPTION_INVALID', 'Exception date or kind is invalid.');
  }
  if (value.verification !== 'verified' && value.verification !== 'unverified') {
    failSessionHours('SESSION_HOURS_EXCEPTION_INVALID', 'Exception verification is invalid.');
  }
  if (value.kind === 'source-unavailable') {
    if (value.verification !== 'unverified' || value.eligibleIntervals !== null) {
      failSessionHours('SESSION_HOURS_EXCEPTION_OVERRIDE_UNVERIFIED', 'Unavailable source cannot override schedule.');
    }
  } else if (value.verification !== 'verified' || !value.eligibleIntervals) {
    failSessionHours('SESSION_HOURS_EXCEPTION_OVERRIDE_UNVERIFIED', 'Only verified exceptions may override schedule.');
  }
  if (value.eligibleIntervals !== null) {
    exactRecord(value.eligibleIntervals, ['eth', 'rth'], 'exception.eligibleIntervals');
  }
  const eligibleIntervals = value.eligibleIntervals === null ? null : Object.freeze({
    eth: normalizeIntervals(value.eligibleIntervals.eth, 'exception.eth'),
    rth: normalizeIntervals(value.eligibleIntervals.rth, 'exception.rth'),
  });
  return Object.freeze({
    calendarRevision: revision,
    eligibleIntervals,
    kind: value.kind,
    source: normalizeSource(value.source),
    verification: value.verification,
    wallDate: value.wallDate,
  });
}

/** Create an immutable, versioned calendar for UTC-like exchange wall-clock labels. */
export function createSessionHoursCalendar(value) {
  exactRecord(value, [
    'exceptions', 'revision', 'schemaVersion', 'supportedInstrumentIds',
    'wallClockEncoding', 'weeklySchedule',
  ], 'calendar');
  if (value.schemaVersion !== 1 || value.wallClockEncoding !== 'exchange-wall-clock-utc-like') {
    failSessionHours('SESSION_HOURS_CALENDAR_VERSION_UNSUPPORTED', 'Calendar schema or wall-clock encoding is unsupported.');
  }
  const revision = nonEmptyString(value.revision, 'revision');
  if (!Array.isArray(value.supportedInstrumentIds) || value.supportedInstrumentIds.length === 0) {
    failSessionHours('SESSION_HOURS_INSTRUMENTS_INVALID', 'supportedInstrumentIds must be non-empty.');
  }
  const supportedInstrumentIds = Object.freeze(value.supportedInstrumentIds.map((id) => nonEmptyString(id, 'instrumentId')));
  if (new Set(supportedInstrumentIds).size !== supportedInstrumentIds.length) {
    failSessionHours('SESSION_HOURS_INSTRUMENTS_INVALID', 'supportedInstrumentIds must be unique.');
  }
  if (!Array.isArray(value.exceptions)) {
    failSessionHours('SESSION_HOURS_EXCEPTIONS_INVALID', 'exceptions must be an array.');
  }
  const exceptions = Object.freeze(value.exceptions.map((entry) => normalizeException(entry, revision)));
  if (new Set(exceptions.map((entry) => entry.wallDate)).size !== exceptions.length) {
    failSessionHours('SESSION_HOURS_EXCEPTION_DUPLICATE', 'Only one exception may exist per wall date.');
  }
  const calendar = {
    schemaVersion: 1,
    exceptions,
    revision,
    supportedInstrumentIds,
    wallClockEncoding: value.wallClockEncoding,
    weeklySchedule: normalizeWeeklySchedule(value.weeklySchedule),
  };
  Object.defineProperty(calendar, SESSION_HOURS_CALENDAR_BRAND, { value: true });
  return Object.freeze(calendar);
}
