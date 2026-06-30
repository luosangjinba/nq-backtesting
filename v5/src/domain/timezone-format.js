import {
  DEFAULT_EXCHANGE_TIMEZONE,
  DEFAULT_DISPLAY_TIMEZONE,
  DISPLAY_TIMEZONES,
} from '../contracts/timezone-contracts.js';
import { parseCanonicalTimeMs } from './canonical-time.js';

function timestampSeconds(value) {
  if (typeof value === 'number') {
    return Math.floor(value);
  }

  const parsed = parseCanonicalTimeMs(value) / 1000;

  if (!Number.isFinite(parsed)) {
    throw new Error('timezone timestamp must be valid.');
  }
  return Math.floor(parsed);
}

function getUtcWallParts(timestamp) {
  const date = new Date(timestampSeconds(timestamp) * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function getTimeZoneParts(epochMs, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(epochMs))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function partsToUtcMs(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function getOffsetMs(epochMs, timeZone) {
  return partsToUtcMs(getTimeZoneParts(epochMs, timeZone)) - epochMs;
}

export function resolveDisplayTimezone(displayTimezone = DEFAULT_DISPLAY_TIMEZONE, {
  exchangeTimezone = DEFAULT_EXCHANGE_TIMEZONE,
} = {}) {
  if (!displayTimezone || displayTimezone === DISPLAY_TIMEZONES.EXCHANGE) {
    return exchangeTimezone;
  }
  return displayTimezone;
}

export function canonicalTimestampToInstantMs(timestamp, {
  exchangeTimezone = DEFAULT_EXCHANGE_TIMEZONE,
} = {}) {
  const wallParts = getUtcWallParts(timestamp);
  const wallUtcMs = partsToUtcMs(wallParts);
  let instantMs = wallUtcMs - getOffsetMs(wallUtcMs, exchangeTimezone);
  instantMs = wallUtcMs - getOffsetMs(instantMs, exchangeTimezone);
  return instantMs;
}

export function formatDisplayTimestamp(timestamp, {
  displayTimezone = DEFAULT_DISPLAY_TIMEZONE,
  exchangeTimezone = DEFAULT_EXCHANGE_TIMEZONE,
  timeFormat = '24h',
  includeSeconds = false,
} = {}) {
  const timeZone = resolveDisplayTimezone(displayTimezone, { exchangeTimezone });
  const instantMs = canonicalTimestampToInstantMs(timestamp, { exchangeTimezone });
  const parts = getTimeZoneParts(instantMs, timeZone);
  const pad = (item) => String(item).padStart(2, '0');
  const hourText = timeFormat === '12h'
    ? String(((parts.hour + 11) % 12) + 1)
    : pad(parts.hour);
  const suffix = timeFormat === '12h'
    ? ` ${parts.hour >= 12 ? 'PM' : 'AM'}`
    : '';
  const time = includeSeconds
    ? `${hourText}:${pad(parts.minute)}:${pad(parts.second)}${suffix}`
    : `${hourText}:${pad(parts.minute)}${suffix}`;
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${time}`;
}
