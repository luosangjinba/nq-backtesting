import { requireEpochMs } from './validation.js';

function pad(value) {
  return String(value).padStart(2, '0');
}

/** Decode a UTC-like epoch as an exchange wall-clock label without timezone conversion. */
export function decodeExchangeWallClock(epochMs) {
  requireEpochMs(epochMs, 'epochMs');
  const value = new Date(epochMs);
  return Object.freeze({
    date: `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`,
    dayOfWeek: value.getUTCDay(),
    minuteOfDay: (value.getUTCHours() * 60) + value.getUTCMinutes(),
  });
}
