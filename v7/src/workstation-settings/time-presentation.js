import { readWorkstationSettings } from './settings-value.js';

const WEEKDAYS = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

function pad(value) {
  return String(value).padStart(2, '0');
}

function partsFor(epochMs, formatter) {
  if (!Number.isFinite(epochMs)) throw new TypeError('Time presentation requires a finite epoch.');
  const parts = Object.fromEntries(formatter.formatToParts(new Date(epochMs))
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, value]));
  return Object.freeze(parts);
}

function wallParts(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new TypeError('Wall-time presentation requires a valid Date.');
  }
  return Object.freeze({
    day: pad(date.getDate()),
    hour: pad(date.getHours()),
    minute: pad(date.getMinutes()),
    month: pad(date.getMonth() + 1),
    second: pad(date.getSeconds()),
    weekday: WEEKDAYS[date.getDay()],
    year: String(date.getFullYear()),
  });
}

function dateText(parts, dateFormat, { compact = false, weekday = false } = {}) {
  const year = compact ? parts.year.slice(-2) : parts.year;
  const patterns = {
    'DD/MM/YYYY': `${parts.day}/${parts.month}/${year}`,
    'MM/DD/YYYY': `${parts.month}/${parts.day}/${year}`,
    'YYYY-MM-DD': `${year}-${parts.month}-${parts.day}`,
    'YYYY/MM/DD': `${year}/${parts.month}/${parts.day}`,
  };
  const value = patterns[dateFormat];
  return weekday ? `${parts.weekday} ${value}` : value;
}

function monthText(parts, dateFormat) {
  if (dateFormat.startsWith('YYYY')) {
    return `${parts.year}${dateFormat.includes('-') ? '-' : '/'}${parts.month}`;
  }
  return `${parts.month}/${parts.year}`;
}

function timeText(parts, hourFormat, seconds = false) {
  const suffix = seconds ? `:${parts.second}` : '';
  if (hourFormat === '24-hour') return `${parts.hour}:${parts.minute}${suffix}`;
  const hour = Number(parts.hour);
  return `${hour % 12 || 12}:${parts.minute}${suffix} ${hour < 12 ? 'AM' : 'PM'}`;
}

function localZone(candidate) {
  if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** Build one immutable formatter policy without changing or re-encoding its input epochs. */
export function createTimePresentation(settings, { localTimeZone = null } = {}) {
  const { time } = readWorkstationSettings(settings);
  const resolvedLocalTimeZone = localZone(localTimeZone);
  const timeZone = time.displayTimezone === 'local'
    ? resolvedLocalTimeZone
    : time.displayTimezone;
  const instantFormatter = new Intl.DateTimeFormat('en-US', {
    day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit', month: '2-digit',
    second: '2-digit', timeZone, timeZoneName: 'short', weekday: 'short', year: 'numeric',
  });
  const timeZoneLabel = time.displayTimezone === 'America/New_York'
    ? 'New York'
    : (time.displayTimezone === 'UTC' ? 'UTC' : `Local · ${resolvedLocalTimeZone}`);

  function instantParts(epochMs) {
    return partsFor(epochMs, instantFormatter);
  }

  function formatDate(epochMs, options = {}) {
    return dateText(instantParts(epochMs), time.dateFormat, {
      ...options,
      weekday: options.weekday ?? time.dayOfWeekVisible,
    });
  }

  function formatTime(epochMs, { seconds = false } = {}) {
    return timeText(instantParts(epochMs), time.hourFormat, seconds);
  }

  function formatDateTime(epochMs, {
    seconds = false,
    timeZoneName = true,
    weekday = time.dayOfWeekVisible,
  } = {}) {
    const parts = instantParts(epochMs);
    return `${dateText(parts, time.dateFormat, { weekday })}, ${timeText(parts, time.hourFormat, seconds)}`
      + (timeZoneName ? ` ${parts.timeZoneName}` : '');
  }

  return Object.freeze({
    calendarPresentation: Object.freeze({
      formatDate: (date) => dateText(wallParts(date), time.dateFormat, {
        weekday: time.dayOfWeekVisible,
      }),
      formatTime: (date, { seconds = false } = {}) => (
        timeText(wallParts(date), time.hourFormat, seconds)
      ),
      hourFormat: time.hourFormat,
    }),
    formatAxisTick(epochMs, type) {
      const parts = instantParts(epochMs);
      if (type === 'year') return parts.year;
      if (type === 'month') return monthText(parts, time.dateFormat);
      if (type === 'day') return dateText(parts, time.dateFormat, { compact: true });
      return timeText(parts, time.hourFormat, type === 'time-with-seconds');
    },
    formatChartCrosshair: (epochMs) => formatDateTime(epochMs, { timeZoneName: false }),
    formatDate,
    formatDateTime,
    formatTime,
    hourFormat: time.hourFormat,
    timeZone,
    timeZoneLabel,
  });
}
