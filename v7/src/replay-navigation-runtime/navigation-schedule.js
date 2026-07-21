import { REPLAY_GOTO_ANCHORS } from '../replay-pane-response-contract/public.js';
import { failReplayNavigation } from './navigation-error.js';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const SCHEDULES = new WeakSet();
const FIELD_BY_ANCHOR = Object.freeze({
  'asian-session': 'asianSession',
  'london-session': 'londonSession',
  'new-york-session': 'newYorkSession',
  'next-day-open': 'dayOpen',
});
const SESSION_ANCHORS = Object.freeze(['asian-session', 'london-session', 'new-york-session']);

export const DEFAULT_REPLAY_NAVIGATION_ANCHORS = Object.freeze({
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '02:00',
  newYorkSession: '09:30',
});

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

function normalizeTime(value, field) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    failReplayNavigation('REPLAY_NAVIGATION_ANCHOR_TIME_INVALID', `${field} must use HH:mm.`);
  }
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) {
    failReplayNavigation('REPLAY_NAVIGATION_ANCHOR_TIME_INVALID', `${field} must be a valid time.`);
  }
  return value;
}

function normalizeAnchors(value) {
  const fields = Object.keys(DEFAULT_REPLAY_NAVIGATION_ANCHORS);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== fields.sort().join(',')) {
    failReplayNavigation('REPLAY_NAVIGATION_ANCHORS_INVALID', 'Navigation anchors must contain four exact fields.');
  }
  return Object.freeze(Object.fromEntries(fields.map((field) => [field, normalizeTime(value[field], field)])));
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
 * Inputs: four HH:mm anchors, candidate bound, and anchor-distance bound.
 * Outputs: branded immutable schedule with a pure candidates() query.
 * Side effects/lifecycle: none.
 * Errors: stable ReplayNavigationRuntimeError validation failures.
 */
export function createReplayNavigationSchedule({
  anchors = DEFAULT_REPLAY_NAVIGATION_ANCHORS,
  maxAnchorDistanceMs = 15 * 60_000,
  maxCandidates = 32,
} = {}) {
  const acceptedAnchors = normalizeAnchors(anchors);
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
