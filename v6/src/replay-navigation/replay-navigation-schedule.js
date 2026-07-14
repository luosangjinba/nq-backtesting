import { normalizeUnixMilliseconds } from '../time-domain/time-domain.js';
import {
  NEW_YORK_TIME_ZONE,
  resolveNewYorkChartWallClockTimestamp,
  resolveNewYorkWallClockInstants as resolveSharedNewYorkWallClockInstants,
} from '../time-domain/new-york-wall-clock.js';

export const REPLAY_NAVIGATION_TIME_ZONE = NEW_YORK_TIME_ZONE;

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

function getReplayWallClockParts(timestampMs) {
  const date = new Date(timestampMs);
  return {
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    month: date.getUTCMonth() + 1,
    second: date.getUTCSeconds(),
    year: date.getUTCFullYear(),
  };
}

function partsUtcMs(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
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
  const normalizedTime = normalizeReplayNavigationAnchorTime(time);
  try {
    return resolveSharedNewYorkWallClockInstants({ date, time: normalizedTime });
  } catch (error) {
    throw new Error(String(error.message).replace('New York wall-clock', 'Replay navigation local'));
  }
}

export function resolveReplayWallClockTimestamp({
  date,
  time,
} = {}) {
  const normalizedTime = normalizeReplayNavigationAnchorTime(time);
  try {
    return resolveNewYorkChartWallClockTimestamp({ date, time: normalizedTime });
  } catch (error) {
    throw new Error(String(error.message).replace('New York wall-clock', 'Replay navigation local'));
  }
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

  const cursorDate = getReplayWallClockParts(cursorMs);
  const candidates = [];
  for (let dayOffset = 0; dayOffset <= 370 && candidates.length < limit; dayOffset += 1) {
    const localDate = addCalendarDays(cursorDate, dayOffset);
    const date = localDateText(localDate);
    const dayCandidates = ACTION_ANCHORS[normalizedAction].flatMap((anchor) => {
      const localTime = normalizedAnchors[anchor];
      return [resolveReplayWallClockTimestamp({ date, time: localTime })].map((timestampMs) => ({
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
