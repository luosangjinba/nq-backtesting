import { REPLAY_GOTO_ANCHORS } from '../replay-pane-response-contract/public.js';
import {
  createReplayNavigationSettings,
  DEFAULT_REPLAY_NAVIGATION_SETTINGS,
  readReplayNavigationSettings,
} from '../replay-navigation-settings/public.js';
import { failReplayNavigation } from './navigation-error.js';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const SCHEDULES = new WeakSet();
const FIELD_BY_ANCHOR = Object.freeze({
  'asian-session': 'asianSession',
  'london-session': 'londonSession',
  'new-york-session': 'newYorkSession',
  'next-day-open': 'dayOpen',
  'silver-bullet-london': 'silverBulletLondon',
  'silver-bullet-new-york-am': 'silverBulletNewYorkAm',
  'silver-bullet-new-york-pm': 'silverBulletNewYorkPm',
});
// `Next Session` intentionally excludes Day Open and Silver Bullet anchors.
const SESSION_ANCHORS = Object.freeze(['asian-session', 'london-session', 'new-york-session']);

export const DEFAULT_REPLAY_NAVIGATION_ANCHORS = DEFAULT_REPLAY_NAVIGATION_SETTINGS;

const formatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit',
  month: '2-digit', timeZone: 'America/New_York', year: 'numeric',
});

function partsAt(epochMs) {
  return Object.fromEntries(formatter.formatToParts(epochMs)
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, Number(value)]));
}

function dateLabel({ day, month, year }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(parts, offset) {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset, 12));
  return { day: value.getUTCDate(), month: value.getUTCMonth() + 1, year: value.getUTCFullYear() };
}

function normalizeAnchors(value) {
  try {
    return readReplayNavigationSettings(createReplayNavigationSettings(value));
  } catch (error) {
    const code = error?.code === 'REPLAY_NAVIGATION_SETTINGS_TIME_INVALID'
      ? 'REPLAY_NAVIGATION_ANCHOR_TIME_INVALID'
      : 'REPLAY_NAVIGATION_ANCHORS_INVALID';
    failReplayNavigation(code, error?.message ?? 'Navigation anchors are invalid.');
  }
}

function wallClockInstants(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallEpochMs = Date.UTC(year, month - 1, day, hour, minute);
  return [wallEpochMs + (4 * HOUR_MS), wallEpochMs + (5 * HOUR_MS)]
    .filter((epochMs, index, values) => values.indexOf(epochMs) === index)
    .filter((epochMs) => {
      const parts = partsAt(epochMs);
      return parts.year === year && parts.month === month && parts.day === day
        && parts.hour === hour && parts.minute === minute;
    })
    .sort((left, right) => left - right);
}

function requireEpoch(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failReplayNavigation('REPLAY_NAVIGATION_EPOCH_INVALID', `${field} must be an epoch millisecond.`);
  }
  return value;
}

function anchorIds(anchor) {
  if (!REPLAY_GOTO_ANCHORS.includes(anchor)) {
    failReplayNavigation('REPLAY_NAVIGATION_ANCHOR_INVALID', 'Quick GoTo anchor is unsupported.');
  }
  return anchor === 'next-session' ? SESSION_ANCHORS : [anchor];
}

function dayCandidates(anchor, anchors, date) {
  return anchorIds(anchor).flatMap((anchorId) => {
    const field = FIELD_BY_ANCHOR[anchorId];
    return wallClockInstants(date, anchors[field]).map((targetEpochMs) => Object.freeze({
      anchor: anchorId,
      localDate: date,
      localTime: anchors[field],
      targetEpochMs,
    }));
  }).sort((left, right) => left.targetEpochMs - right.targetEpochMs);
}

/**
 * Owner: Replay navigation domain.
 * Purpose: generate bounded, strictly-forward New York schedule candidates;
 * holidays and market availability remain source-data decisions.
 * Inputs: seven HH:mm anchors, candidate bound, and anchor-distance bound.
 * Outputs: branded immutable schedule with a pure candidates() query.
 * Side effects/lifecycle: none.
 * Errors: stable ReplayNavigationRuntimeError validation failures.
 */
export function createReplayNavigationSchedule({
  anchors = DEFAULT_REPLAY_NAVIGATION_ANCHORS,
  maxAnchorDistanceMs = 15 * 60_000,
  maxCandidates = 32,
  settings = null,
} = {}) {
  if (settings !== null && anchors !== DEFAULT_REPLAY_NAVIGATION_ANCHORS) {
    failReplayNavigation('REPLAY_NAVIGATION_ANCHORS_INVALID', 'Use settings or anchors, not both.');
  }
  const acceptedAnchors = settings === null
    ? normalizeAnchors(anchors)
    : readReplayNavigationSettings(settings);
  if (!Number.isSafeInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 366
    || !Number.isSafeInteger(maxAnchorDistanceMs) || maxAnchorDistanceMs < 1 || maxAnchorDistanceMs > DAY_MS) {
    failReplayNavigation('REPLAY_NAVIGATION_SCHEDULE_BOUNDS_INVALID', 'Navigation schedule bounds are invalid.');
  }
  const schedule = Object.freeze({
    anchors: acceptedAnchors,
    candidates({ anchor, cursorEpochMs, endEpochMs }) {
      const cursor = requireEpoch(cursorEpochMs, 'cursorEpochMs');
      const end = requireEpoch(endEpochMs, 'endEpochMs');
      if (cursor >= end) return Object.freeze([]);
      const startDate = partsAt(cursor);
      const candidates = [];
      for (let offset = 0; offset < 370 && candidates.length < maxCandidates; offset += 1) {
        const date = dateLabel(addDays(startDate, offset));
        const accepted = dayCandidates(anchor, acceptedAnchors, date)
          .filter(({ targetEpochMs }) => targetEpochMs > cursor && targetEpochMs <= end);
        candidates.push(...accepted.slice(0, maxCandidates - candidates.length));
      }
      return Object.freeze(candidates);
    },
    maxAnchorDistanceMs,
    maxCandidates,
  });
  SCHEDULES.add(schedule);
  return schedule;
}

/**
 * Owner: Replay navigation domain.
 * Purpose: reject structural schedule lookalikes at target resolution ports.
 * Inputs/outputs: unknown candidate; returns the branded immutable schedule.
 * Side effects/lifecycle: none.
 * Errors: REPLAY_NAVIGATION_SCHEDULE_REQUIRED.
 */
export function requireReplayNavigationSchedule(candidate) {
  if (!candidate || !SCHEDULES.has(candidate)) {
    failReplayNavigation('REPLAY_NAVIGATION_SCHEDULE_REQUIRED', 'A branded navigation schedule is required.');
  }
  return candidate;
}
