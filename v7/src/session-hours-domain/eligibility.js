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
  return intervals.some(({ startMinute, endMinute }) => (
    minuteOfDay >= startMinute && minuteOfDay < endMinute
  ));
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
  const wall = decodeExchangeWallClock(requireEpochMs(value.startEpochMs, 'startEpochMs'));
  const exception = calendar.exceptions.find((entry) => entry.wallDate === wall.date) ?? null;
  const intervals = exception?.eligibleIntervals?.[mode]
    ?? calendar.weeklySchedule[mode][wall.dayOfWeek];
  return Object.freeze({
    calendarRevision: calendar.revision,
    eligible: contains(intervals, wall.minuteOfDay),
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
  return Object.freeze({
    deterministic: true,
    id,
    isEligible: (bar, context) => evaluateSessionHours({
      calendar,
      instrumentId: context.instrument.id,
      mode,
      startEpochMs: bar.startEpochMs,
    }).eligible,
    revision: calendar.revision,
  });
}
