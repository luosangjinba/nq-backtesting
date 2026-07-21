import { decodeExchangeWallClock } from './wall-clock.js';
import { SESSION_HOURS_CALENDAR_BRAND } from './calendar.js';
import { failSessionHours } from './session-hours-error.js';
import { exactRecord, nonEmptyString, requireEpochMs, requireMode } from './validation.js';

function requireInstrument(calendar, instrumentId) {
  nonEmptyString(instrumentId, 'instrumentId');
  if (!calendar.supportedInstrumentIds.includes(instrumentId)) {
    failSessionHours('SESSION_HOURS_INSTRUMENT_UNSUPPORTED', 'Instrument is not registered by this calendar.');
  }
}

function contains(intervals, minuteOfDay) {
  for (const { startMinute, endMinute } of intervals) {
    if (minuteOfDay >= startMinute && minuteOfDay < endMinute) return true;
  }
  return false;
}

function sessionHoursAt(calendar, mode, startEpochMs) {
  const dayNumber = Math.floor(startEpochMs / 86_400_000);
  const dayEpochMs = dayNumber * 86_400_000;
  const dayOfWeek = (dayNumber + 4) % 7;
  const minuteOfDay = Math.floor((startEpochMs - dayEpochMs) / 60_000);
  let intervals = calendar.weeklySchedule[mode][dayOfWeek];
  if (calendar.exceptions.length > 0) {
    const value = new Date(startEpochMs);
    const wallDate = [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, '0'),
      String(value.getUTCDate()).padStart(2, '0'),
    ].join('-');
    const exception = calendar.exceptions.find((entry) => entry.wallDate === wallDate) ?? null;
    intervals = exception?.eligibleIntervals?.[mode] ?? intervals;
  }
  return contains(intervals, minuteOfDay);
}

/** Evaluate one bar-open epoch using half-open Session Hours intervals. */
export function evaluateSessionHours(value) {
  exactRecord(value, ['calendar', 'instrumentId', 'mode', 'startEpochMs'], 'evaluation');
  const { calendar } = value;
  if (!calendar || calendar[SESSION_HOURS_CALENDAR_BRAND] !== true || !Object.isFrozen(calendar)) {
    failSessionHours('SESSION_HOURS_CALENDAR_INVALID', 'calendar must be created by this domain.');
  }
  requireInstrument(calendar, value.instrumentId);
  const mode = requireMode(value.mode);
  const startEpochMs = requireEpochMs(value.startEpochMs, 'startEpochMs');
  const wall = decodeExchangeWallClock(startEpochMs);
  const exception = calendar.exceptions.find((entry) => entry.wallDate === wall.date) ?? null;
  return Object.freeze({
    calendarRevision: calendar.revision,
    eligible: sessionHoursAt(calendar, mode, startEpochMs),
    exceptionKind: exception?.kind ?? null,
    mode,
    verification: exception?.verification ?? 'normal',
    wallDate: wall.date,
    wallMinute: wall.minuteOfDay,
  });
}

/** Create the exact frozen eligibility port consumed by Projection Domain. */
export function createSessionHoursPolicy(value) {
  exactRecord(value, ['calendar', 'id', 'mode'], 'policy');
  const id = nonEmptyString(value.id, 'policy.id');
  const mode = requireMode(value.mode);
  const { calendar } = value;
  if (!calendar || calendar[SESSION_HOURS_CALENDAR_BRAND] !== true || !Object.isFrozen(calendar)) {
    failSessionHours('SESSION_HOURS_CALENDAR_INVALID', 'calendar must be created by this domain.');
  }
  const supportedInstrumentIds = new Set(calendar.supportedInstrumentIds);
  return Object.freeze({
    deterministic: true,
    id,
    isEligible: (bar, context) => {
      const instrumentId = context?.instrument?.id;
      if (!supportedInstrumentIds.has(instrumentId)) requireInstrument(calendar, instrumentId);
      const startEpochMs = requireEpochMs(bar?.startEpochMs, 'startEpochMs');
      return sessionHoursAt(calendar, mode, startEpochMs);
    },
    mode,
    revision: calendar.revision,
  });
}
