import { resolveNewYorkWallClockInstants } from './new-york-wall-clock.js';

function partsFromChartTimestamp(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  return {
    date: date.toISOString().slice(0, 10),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    time: date.toISOString().slice(11, 16),
  };
}

const WEEKDAYS = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

function presentationParts(timestamp, displayTimezone = 'exchange') {
  const wall = partsFromChartTimestamp(timestamp);
  if (displayTimezone === 'exchange') {
    const date = new Date(Number(timestamp) * 1000);
    return {
      dayOfWeek: WEEKDAYS[date.getUTCDay()],
      day: date.getUTCDate(),
      hour: wall.hour,
      minute: wall.minute,
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear(),
    };
  }
  const instant = resolveNewYorkWallClockInstants({ date: wall.date, time: wall.time })[0];
  if (!Number.isFinite(instant)) return presentationParts(timestamp, 'exchange');
  const date = new Date(instant);
  const local = displayTimezone === 'local';
  return {
    dayOfWeek: WEEKDAYS[local ? date.getDay() : date.getUTCDay()],
    day: local ? date.getDate() : date.getUTCDate(),
    hour: local ? date.getHours() : date.getUTCHours(),
    minute: local ? date.getMinutes() : date.getUTCMinutes(),
    month: (local ? date.getMonth() : date.getUTCMonth()) + 1,
    year: local ? date.getFullYear() : date.getUTCFullYear(),
  };
}

export function formatDateParts({ day, month, year }, dateFormat = 'yyyy/mm/dd') {
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year).padStart(4, '0');
  if (dateFormat === 'yyyy-mm-dd') return `${yyyy}-${mm}-${dd}`;
  if (dateFormat === 'dd/mm/yyyy') return `${dd}/${mm}/${yyyy}`;
  if (dateFormat === 'mm/dd/yyyy') return `${mm}/${dd}/${yyyy}`;
  return `${yyyy}/${mm}/${dd}`;
}

export function formatHourMinute(hour, minute, timeFormat = '24h') {
  const normalizedHour = Number(hour);
  const normalizedMinute = String(Number(minute)).padStart(2, '0');
  if (timeFormat !== '12h') return `${String(normalizedHour).padStart(2, '0')}:${normalizedMinute}`;
  const suffix = normalizedHour >= 12 ? 'PM' : 'AM';
  const hour12 = normalizedHour % 12 || 12;
  return `${hour12}:${normalizedMinute} ${suffix}`;
}

export function formatCanonicalTime(value, timeFormat = '24h') {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return String(value || '');
  return formatHourMinute(Number(match[1]), Number(match[2]), timeFormat);
}

export function parseDisplayedTime(value, timeFormat = '24h') {
  const normalized = String(value || '').trim().toUpperCase();
  const canonical = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (canonical) return `${canonical[1]}:${canonical[2]}`;
  if (timeFormat !== '12h') return null;
  const twelveHour = normalized.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/);
  if (!twelveHour) return null;
  let hour = Number(twelveHour[1]) % 12;
  if (twelveHour[3] === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${twelveHour[2]}`;
}

export function formatChartTime(timestamp, { displayTimezone = 'exchange', timeFormat = '24h' } = {}) {
  const parts = presentationParts(timestamp, displayTimezone);
  return formatHourMinute(parts.hour, parts.minute, timeFormat);
}

export function formatChartDateTime(timestamp, {
  dateFormat = 'yyyy/mm/dd',
  displayTimezone = 'exchange',
  showDayOfWeek = true,
  timeFormat = '24h',
} = {}) {
  const parts = presentationParts(timestamp, displayTimezone);
  const date = formatDateParts(parts, dateFormat);
  const time = formatHourMinute(parts.hour, parts.minute, timeFormat);
  return `${showDayOfWeek ? `${parts.dayOfWeek} ` : ''}${date} ${time}`;
}
