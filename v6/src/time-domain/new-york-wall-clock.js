export const NEW_YORK_TIME_ZONE = 'America/New_York';

const formatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  month: '2-digit',
  second: '2-digit',
  timeZone: NEW_YORK_TIME_ZONE,
  year: 'numeric',
});

function partsUtcMs(parts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour || 0,
    parts.minute || 0,
    parts.second || 0,
  );
}

function sameWallClock(left, right) {
  return left.year === right.year
    && left.month === right.month
    && left.day === right.day
    && left.hour === right.hour
    && left.minute === right.minute
    && left.second === right.second;
}

export function getNewYorkWallClockParts(timestampMs) {
  const values = Object.fromEntries(formatter.formatToParts(new Date(timestampMs))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]));
  return Object.freeze({
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    month: values.month,
    second: values.second,
    year: values.year,
  });
}

export function resolveNewYorkWallClockInstants({ date, time } = {}) {
  const dateMatch = String(date || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(time || '').trim().match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch) throw new Error('New York wall-clock date must use YYYY-MM-DD format.');
  if (!timeMatch || Number(timeMatch[1]) > 23 || Number(timeMatch[2]) > 59) {
    throw new Error('New York wall-clock time must use valid HH:mm time.');
  }
  const target = {
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    month: Number(dateMatch[2]),
    second: 0,
    year: Number(dateMatch[1]),
  };
  const normalizedDate = new Date(Date.UTC(target.year, target.month - 1, target.day, 12));
  if (
    normalizedDate.getUTCFullYear() !== target.year
    || normalizedDate.getUTCMonth() + 1 !== target.month
    || normalizedDate.getUTCDate() !== target.day
  ) {
    throw new Error('New York wall-clock date must be valid.');
  }

  const targetWallMs = partsUtcMs(target);
  let estimateMs = targetWallMs;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    estimateMs += targetWallMs - partsUtcMs(getNewYorkWallClockParts(estimateMs));
  }
  const matches = [];
  for (let offsetMinutes = -180; offsetMinutes <= 180; offsetMinutes += 15) {
    const candidateMs = estimateMs + (offsetMinutes * 60_000);
    if (sameWallClock(getNewYorkWallClockParts(candidateMs), target)) matches.push(candidateMs);
  }
  return [...new Set(matches)].sort((left, right) => left - right);
}
