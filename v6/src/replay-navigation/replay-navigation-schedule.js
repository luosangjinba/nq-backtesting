import { normalizeUnixMilliseconds } from '../time-domain/time-domain.js';

export const REPLAY_NAVIGATION_TIME_ZONE = 'America/New_York';

export const REPLAY_NAVIGATION_ACTIONS = Object.freeze({
  ASIAN_SESSION: 'asian-session',
  LONDON_SESSION: 'london-session',
  NEW_YORK_SESSION: 'new-york-session',
  NEXT_DAY_OPEN: 'next-day-open',
  NEXT_SESSION: 'next-session',
});

export const DEFAULT_REPLAY_NAVIGATION_ANCHORS = Object.freeze({
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '02:00',
  newYorkSession: '09:30',
});

const ACTION_ANCHORS = Object.freeze({
  [REPLAY_NAVIGATION_ACTIONS.ASIAN_SESSION]: ['asianSession'],
  [REPLAY_NAVIGATION_ACTIONS.LONDON_SESSION]: ['londonSession'],
  [REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION]: ['newYorkSession'],
  [REPLAY_NAVIGATION_ACTIONS.NEXT_DAY_OPEN]: ['dayOpen'],
  [REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION]: ['asianSession', 'londonSession', 'newYorkSession'],
});

const formatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  month: '2-digit',
  second: '2-digit',
  timeZone: REPLAY_NAVIGATION_TIME_ZONE,
  year: 'numeric',
});

function getNewYorkParts(timestampMs) {
  const values = Object.fromEntries(formatter.formatToParts(new Date(timestampMs))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]));
  return {
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    month: values.month,
    second: values.second,
    year: values.year,
  };
}

function partsUtcMs(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
}

function sameWallClock(left, right) {
  return left.year === right.year
    && left.month === right.month
    && left.day === right.day
    && left.hour === right.hour
    && left.minute === right.minute
    && left.second === right.second;
}

function addCalendarDays(dateParts, days) {
  const date = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + days, 12));
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function localDateText(parts) {
  return [parts.year, parts.month, parts.day].map((value, index) => (
    index === 0 ? String(value).padStart(4, '0') : String(value).padStart(2, '0')
  )).join('-');
}

function normalizeAction(action) {
  const normalized = String(action || '').trim();
  if (!Object.hasOwn(ACTION_ANCHORS, normalized)) {
    throw new Error(`Replay navigation action is unsupported: ${action}`);
  }
  return normalized;
}

export function normalizeReplayNavigationAnchorTime(value, {
  fieldName = 'anchor time',
} = {}) {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^(\d{2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new Error(`Replay navigation ${fieldName} must use valid HH:mm time.`);
  }
  return normalized;
}

export function normalizeReplayNavigationAnchors(input = {}) {
  return Object.freeze(Object.fromEntries(Object.entries(DEFAULT_REPLAY_NAVIGATION_ANCHORS)
    .map(([key, fallback]) => [key, normalizeReplayNavigationAnchorTime(input[key] ?? fallback, {
      fieldName: key,
    })])));
}

export function resolveNewYorkWallClockInstants({
  date,
  time,
} = {}) {
  const dateMatch = String(date || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const normalizedTime = normalizeReplayNavigationAnchorTime(time);
  if (!dateMatch) {
    throw new Error('Replay navigation local date must use YYYY-MM-DD format.');
  }
  const [hour, minute] = normalizedTime.split(':').map(Number);
  const target = {
    day: Number(dateMatch[3]),
    hour,
    minute,
    month: Number(dateMatch[2]),
    second: 0,
    year: Number(dateMatch[1]),
  };
  const targetWallMs = partsUtcMs(target);
  const normalizedDate = new Date(Date.UTC(target.year, target.month - 1, target.day, 12));
  if (
    normalizedDate.getUTCFullYear() !== target.year
    || normalizedDate.getUTCMonth() + 1 !== target.month
    || normalizedDate.getUTCDate() !== target.day
  ) {
    throw new Error('Replay navigation local date must be valid.');
  }

  let estimateMs = targetWallMs;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const displayedWallMs = partsUtcMs(getNewYorkParts(estimateMs));
    estimateMs += targetWallMs - displayedWallMs;
  }

  const matches = [];
  for (let offsetMinutes = -180; offsetMinutes <= 180; offsetMinutes += 15) {
    const candidateMs = estimateMs + (offsetMinutes * 60_000);
    if (sameWallClock(getNewYorkParts(candidateMs), target)) {
      matches.push(candidateMs);
    }
  }
  return [...new Set(matches)].sort((left, right) => left - right);
}

export function createReplayNavigationCandidates({
  action,
  anchors = DEFAULT_REPLAY_NAVIGATION_ANCHORS,
  cursorTimestamp,
  endTimestamp,
  maxCandidates = 32,
} = {}) {
  const normalizedAction = normalizeAction(action);
  const normalizedAnchors = normalizeReplayNavigationAnchors(anchors);
  const cursorMs = normalizeUnixMilliseconds(cursorTimestamp, {
    fieldName: 'Replay navigation cursorTimestamp',
  });
  const endMs = normalizeUnixMilliseconds(endTimestamp, {
    fieldName: 'Replay navigation endTimestamp',
  });
  const limit = Number(maxCandidates);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('Replay navigation maxCandidates must be a positive integer.');
  }
  if (cursorMs >= endMs) return [];

  const cursorDate = getNewYorkParts(cursorMs);
  const candidates = [];
  for (let dayOffset = 0; dayOffset <= 370 && candidates.length < limit; dayOffset += 1) {
    const localDate = addCalendarDays(cursorDate, dayOffset);
    const date = localDateText(localDate);
    const dayCandidates = ACTION_ANCHORS[normalizedAction].flatMap((anchor) => {
      const localTime = normalizedAnchors[anchor];
      return resolveNewYorkWallClockInstants({ date, time: localTime }).map((timestampMs) => ({
        action: normalizedAction,
        anchor,
        localDate: date,
        localTime,
        timestamp: Math.floor(timestampMs / 1000),
        timestampIso: new Date(timestampMs).toISOString(),
      }));
    })
      .filter((candidate) => candidate.timestamp * 1000 > cursorMs && candidate.timestamp * 1000 <= endMs)
      .sort((left, right) => left.timestamp - right.timestamp);
    candidates.push(...dayCandidates.slice(0, limit - candidates.length));
    if (partsUtcMs({ ...localDate, hour: 23, minute: 59, second: 59 }) > endMs + (36 * 60 * 60 * 1000)) {
      break;
    }
  }
  return candidates.map((candidate) => Object.freeze({ ...candidate }));
}
