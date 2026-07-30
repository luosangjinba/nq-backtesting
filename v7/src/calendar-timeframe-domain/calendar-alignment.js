import { failCalendarTimeframe } from './calendar-timeframe-error.js';
import { requirePeriod, requireSessionStartMinute } from './validation.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function tradingDayEpoch(wallEpochMs, sessionStartMinute, rollsToNextTradingDay) {
  const wallDayEpochMs = Math.floor(wallEpochMs / DAY) * DAY;
  const minuteOfDay = Math.floor((wallEpochMs - wallDayEpochMs) / MINUTE);
  return wallDayEpochMs + (rollsToNextTradingDay && minuteOfDay >= sessionStartMinute ? DAY : 0);
}

function periodStartEpoch(tradingEpochMs, period) {
  if (period === 'day') return tradingEpochMs;
  const value = new Date(tradingEpochMs);
  if (period === 'week') {
    const daysSinceMonday = (value.getUTCDay() + 6) % 7;
    return tradingEpochMs - (daysSinceMonday * DAY);
  }
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1);
}

function nextPeriodStartEpoch(tradingPeriodStartEpochMs, period) {
  if (period === 'day') return tradingPeriodStartEpochMs + DAY;
  if (period === 'week') return tradingPeriodStartEpochMs + (7 * DAY);
  const value = new Date(tradingPeriodStartEpochMs);
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1);
}

function sessionWallStart(tradingPeriodStartEpochMs, sessionStartMinute, rollsToNextTradingDay) {
  return tradingPeriodStartEpochMs + (sessionStartMinute * MINUTE)
    - (rollsToNextTradingDay ? DAY : 0);
}

export function resolveCalendarPeriod(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_ALIGNMENT_INVALID', 'Calendar alignment input must be an object.');
  }
  const period = requirePeriod(value.period);
  const sessionStartMinute = requireSessionStartMinute(value.sessionStartMinute);
  if (!Number.isSafeInteger(value.wallEpochMs) || value.wallEpochMs < 0
    || typeof value.rollsToNextTradingDay !== 'boolean') {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_ALIGNMENT_INVALID', 'Calendar alignment values are invalid.');
  }
  const tradingEpochMs = tradingDayEpoch(
    value.wallEpochMs,
    sessionStartMinute,
    value.rollsToNextTradingDay,
  );
  const tradingPeriodStartEpochMs = periodStartEpoch(tradingEpochMs, period);
  const nextTradingPeriodStartEpochMs = nextPeriodStartEpoch(tradingPeriodStartEpochMs, period);
  return Object.freeze({
    nextWallStartEpochMs: sessionWallStart(
      nextTradingPeriodStartEpochMs,
      sessionStartMinute,
      value.rollsToNextTradingDay,
    ),
    tradingPeriodStartEpochMs,
    wallStartEpochMs: sessionWallStart(
      tradingPeriodStartEpochMs,
      sessionStartMinute,
      value.rollsToNextTradingDay,
    ),
  });
}
