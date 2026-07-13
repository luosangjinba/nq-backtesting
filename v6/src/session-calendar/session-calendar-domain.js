import { normalizeUnixSeconds } from '../time-domain/time-domain.js';
import { resolveNewYorkWallClockInstants } from '../time-domain/new-york-wall-clock.js';

const SUPPORTED_FUTURES = Object.freeze(['NQ', 'ES']);
const SESSION_ROLL_HOUR_UTC = 18;
const DAY_SECONDS = 86_400;
const WEEK_SECONDS = 7 * DAY_SECONDS;
const DAY_SEPARATOR_MODES = Object.freeze(['off', 'trading', 'ict', 'both']);

function normalizeInstrument(value) {
  const instrument = String(value || '').trim().toUpperCase();
  if (!SUPPORTED_FUTURES.includes(instrument)) {
    throw new Error(`Session calendar instrument ${instrument || '<missing>'} is not supported.`);
  }
  return instrument;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateKeyFromParts(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function dateKeyFromTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function timestampFromDateKeyAtRoll(dateKey) {
  return normalizeUnixSeconds(`${dateKey}T${pad(SESSION_ROLL_HOUR_UTC)}:00:00Z`, {
    fieldName: 'Session calendar date key',
  });
}

function addDaysToDateKey(dateKey, days) {
  const timestamp = normalizeUnixSeconds(`${dateKey}T00:00:00Z`, {
    fieldName: 'Session calendar date key',
  });
  return dateKeyFromTimestamp(timestamp + (days * DAY_SECONDS));
}

function monthStartKey(dateKey) {
  return `${dateKey.slice(0, 7)}-01`;
}

function previousMondayKey(dateKey) {
  const midnight = normalizeUnixSeconds(`${dateKey}T00:00:00Z`, {
    fieldName: 'Session calendar date key',
  });
  const day = new Date(midnight * 1000).getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  return dateKeyFromTimestamp(midnight - (daysFromMonday * DAY_SECONDS));
}

function tradingDayKeyFromTimestamp(timestamp) {
  const normalizedTimestamp = normalizeUnixSeconds(timestamp, {
    fieldName: 'Session calendar timestamp',
  });
  const date = new Date(normalizedTimestamp * 1000);
  const calendarKey = dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return date.getUTCHours() >= SESSION_ROLL_HOUR_UTC
    ? addDaysToDateKey(calendarKey, 1)
    : calendarKey;
}

export function getTradingDayKey(timestamp, { instrument } = {}) {
  normalizeInstrument(instrument);
  return tradingDayKeyFromTimestamp(timestamp);
}

export function resolveTradingDayBucket(timestamp, { instrument } = {}) {
  const normalizedInstrument = normalizeInstrument(instrument);
  const key = tradingDayKeyFromTimestamp(timestamp);
  const previousDateKey = addDaysToDateKey(key, -1);
  const startTimestamp = timestampFromDateKeyAtRoll(previousDateKey);
  return Object.freeze({
    endTimestamp: startTimestamp + DAY_SECONDS - 1,
    instrument: normalizedInstrument,
    key,
    startTimestamp,
    unit: 'day',
  });
}

export function resolveTradingWeekBucket(timestamp, { instrument } = {}) {
  const normalizedInstrument = normalizeInstrument(instrument);
  const tradingDayKey = tradingDayKeyFromTimestamp(timestamp);
  const weekStartKey = previousMondayKey(tradingDayKey);
  const startTimestamp = timestampFromDateKeyAtRoll(addDaysToDateKey(weekStartKey, -1));
  return Object.freeze({
    endTimestamp: startTimestamp + WEEK_SECONDS - 1,
    instrument: normalizedInstrument,
    key: weekStartKey,
    startTimestamp,
    unit: 'week',
  });
}

export function resolveTradingMonthBucket(timestamp, { instrument } = {}) {
  const normalizedInstrument = normalizeInstrument(instrument);
  const tradingDayKey = tradingDayKeyFromTimestamp(timestamp);
  const monthKey = monthStartKey(tradingDayKey);
  const nextMonthDate = new Date(`${monthKey}T00:00:00Z`);
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const nextMonthKey = dateKeyFromParts(
    nextMonthDate.getUTCFullYear(),
    nextMonthDate.getUTCMonth(),
    nextMonthDate.getUTCDate(),
  );
  const startTimestamp = timestampFromDateKeyAtRoll(addDaysToDateKey(monthKey, -1));
  const nextStartTimestamp = timestampFromDateKeyAtRoll(addDaysToDateKey(nextMonthKey, -1));
  return Object.freeze({
    endTimestamp: nextStartTimestamp - 1,
    instrument: normalizedInstrument,
    key: monthKey.slice(0, 7),
    startTimestamp,
    unit: 'month',
  });
}

export function resolveDaySeparatorInstants({
  fromTimestamp,
  mode = 'off',
  toTimestamp,
} = {}) {
  const normalizedMode = String(mode || '').trim();
  if (!DAY_SEPARATOR_MODES.includes(normalizedMode)) {
    throw new Error(`Session calendar day separator mode is unsupported: ${mode}`);
  }
  if (normalizedMode === 'off') return [];
  const from = normalizeUnixSeconds(fromTimestamp, {
    fieldName: 'Session calendar separator fromTimestamp',
  });
  const to = normalizeUnixSeconds(toTimestamp, {
    fieldName: 'Session calendar separator toTimestamp',
  });
  if (from > to) throw new Error('Session calendar separator range must be ordered.');

  const firstDate = new Date((from - DAY_SECONDS) * 1000);
  const lastDate = new Date((to + DAY_SECONDS) * 1000);
  const cursor = new Date(Date.UTC(
    firstDate.getUTCFullYear(),
    firstDate.getUTCMonth(),
    firstDate.getUTCDate(),
    12,
  ));
  const end = Date.UTC(
    lastDate.getUTCFullYear(),
    lastDate.getUTCMonth(),
    lastDate.getUTCDate(),
    12,
  );
  const types = normalizedMode === 'both'
    ? ['trading', 'ict']
    : [normalizedMode];
  const separators = [];
  while (cursor.getTime() <= end) {
    const date = dateKeyFromParts(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate());
    types.forEach((type) => {
      const time = type === 'trading' ? '18:00' : '00:00';
      resolveNewYorkWallClockInstants({ date, time }).forEach((timestampMs) => {
        const timestamp = Math.floor(timestampMs / 1000);
        if (timestamp >= from && timestamp <= to) {
          separators.push(Object.freeze({ date, time, timestamp, type }));
        }
      });
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return separators.sort((left, right) => left.timestamp - right.timestamp);
}
