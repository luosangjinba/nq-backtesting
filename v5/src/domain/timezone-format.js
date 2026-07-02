import {
  DEFAULT_EXCHANGE_TIMEZONE,
  DEFAULT_DISPLAY_TIMEZONE,
  DISPLAY_TIMEZONES,
} from '../contracts/timezone-contracts.js';
import { CHART_DATE_FORMATS } from '../contracts/chart-presentation-contracts.js';
import { parseCanonicalTimeMs } from './canonical-time.js';

const MONTH_NAMES = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const WEEKDAY_NAMES = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

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

function parseWallClockInput(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error('display wall-clock timestamp must use datetime-local format.');
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
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
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour || 0,
    parts.minute || 0,
    parts.second || 0
  );
}

function weekdayNameForParts(parts) {
  return WEEKDAY_NAMES[new Date(partsToUtcMs(parts)).getUTCDay()];
}

function formatDateParts(parts, {
  dateFormat = CHART_DATE_FORMATS.ISO_DATE,
  showDayOfWeekLabels = false,
  compactIso = false,
} = {}) {
  const pad = (item) => String(item).padStart(2, '0');
  const month = pad(parts.month);
  const day = pad(parts.day);
  const shortYear = String(parts.year).slice(-2);
  const monthName = MONTH_NAMES[parts.month - 1] || month;
  let dateText;
  if (dateFormat === CHART_DATE_FORMATS.MONTH_DAY_YEAR) {
    dateText = `${monthName} ${day} '${shortYear}`;
  } else if (dateFormat === CHART_DATE_FORMATS.DAY_MONTH_YEAR) {
    dateText = `${day} ${monthName} '${shortYear}`;
  } else {
    dateText = compactIso ? `${month}-${day}` : `${parts.year}-${month}-${day}`;
  }
  return showDayOfWeekLabels ? `${weekdayNameForParts(parts)} ${dateText}` : dateText;
}

function getOffsetMs(epochMs, timeZone) {
  return partsToUtcMs(getTimeZoneParts(epochMs, timeZone)) - epochMs;
}

function wallClockPartsToInstantMs(parts, timeZone) {
  const wallUtcMs = partsToUtcMs(parts);
  let instantMs = wallUtcMs - getOffsetMs(wallUtcMs, timeZone);
  instantMs = wallUtcMs - getOffsetMs(instantMs, timeZone);
  return instantMs;
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
  return wallClockPartsToInstantMs(wallParts, exchangeTimezone);
}

export function displayWallClockToCanonicalTimestamp(value, {
  displayTimezone = DEFAULT_DISPLAY_TIMEZONE,
  exchangeTimezone = DEFAULT_EXCHANGE_TIMEZONE,
} = {}) {
  const displayParts = parseWallClockInput(value);
  const timeZone = resolveDisplayTimezone(displayTimezone, { exchangeTimezone });
  const instantMs = wallClockPartsToInstantMs(displayParts, timeZone);
  const exchangeParts = getTimeZoneParts(instantMs, exchangeTimezone);
  return new Date(partsToUtcMs(exchangeParts)).toISOString();
}

export function formatDisplayTimestamp(timestamp, {
  displayTimezone = DEFAULT_DISPLAY_TIMEZONE,
  exchangeTimezone = DEFAULT_EXCHANGE_TIMEZONE,
  timeFormat = '24h',
  dateFormat = CHART_DATE_FORMATS.ISO_DATE,
  showDayOfWeekLabels = false,
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
  return `${formatDateParts(parts, { dateFormat, showDayOfWeekLabels })} ${time}`;
}

export function formatDisplayDate(timestamp, {
  displayTimezone = DEFAULT_DISPLAY_TIMEZONE,
  exchangeTimezone = DEFAULT_EXCHANGE_TIMEZONE,
  dateFormat = CHART_DATE_FORMATS.ISO_DATE,
  showDayOfWeekLabels = false,
  compactIso = false,
} = {}) {
  const timeZone = resolveDisplayTimezone(displayTimezone, { exchangeTimezone });
  const instantMs = canonicalTimestampToInstantMs(timestamp, { exchangeTimezone });
  const parts = getTimeZoneParts(instantMs, timeZone);
  return formatDateParts(parts, { dateFormat, showDayOfWeekLabels, compactIso });
}

export function formatDisplayDateFromParts(parts, {
  dateFormat = CHART_DATE_FORMATS.ISO_DATE,
  showDayOfWeekLabels = false,
  compactIso = false,
} = {}) {
  return formatDateParts(parts, { dateFormat, showDayOfWeekLabels, compactIso });
}
