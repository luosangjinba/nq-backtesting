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

export function formatChartTime(timestamp, { displayTimezone = 'exchange', timeFormat = '24h' } = {}) {
  const wall = partsFromChartTimestamp(timestamp);
  if (displayTimezone === 'exchange') return formatHourMinute(wall.hour, wall.minute, timeFormat);
  const instant = resolveNewYorkWallClockInstants({ date: wall.date, time: wall.time })[0];
  if (!Number.isFinite(instant)) return formatHourMinute(wall.hour, wall.minute, timeFormat);
  const date = new Date(instant);
  const hour = displayTimezone === 'local' ? date.getHours() : date.getUTCHours();
  const minute = displayTimezone === 'local' ? date.getMinutes() : date.getUTCMinutes();
  return formatHourMinute(hour, minute, timeFormat);
}
