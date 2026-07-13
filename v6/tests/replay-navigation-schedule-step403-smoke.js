import assert from 'node:assert/strict';
import {
  createReplayNavigationCandidates,
  DEFAULT_REPLAY_NAVIGATION_ANCHORS,
  normalizeReplayNavigationAnchorTime,
  REPLAY_NAVIGATION_ACTIONS,
  resolveNewYorkWallClockInstants,
} from '../src/replay-navigation/replay-navigation-schedule.js';

assert.deepEqual(DEFAULT_REPLAY_NAVIGATION_ANCHORS, {
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '02:00',
  newYorkSession: '09:30',
});
assert.equal(normalizeReplayNavigationAnchorTime('09:30'), '09:30');
assert.throws(() => normalizeReplayNavigationAnchorTime('24:00'), /valid HH:mm/);
assert.throws(() => normalizeReplayNavigationAnchorTime('9:30'), /valid HH:mm/);

assert.deepEqual(
  resolveNewYorkWallClockInstants({ date: '2026-03-06', time: '09:30' })
    .map((timestamp) => new Date(timestamp).toISOString()),
  ['2026-03-06T14:30:00.000Z'],
);
assert.deepEqual(
  resolveNewYorkWallClockInstants({ date: '2026-03-09', time: '09:30' })
    .map((timestamp) => new Date(timestamp).toISOString()),
  ['2026-03-09T13:30:00.000Z'],
);
assert.deepEqual(
  resolveNewYorkWallClockInstants({ date: '2026-03-08', time: '02:30' }),
  [],
  'nonexistent spring-forward wall times are skipped',
);
assert.deepEqual(
  resolveNewYorkWallClockInstants({ date: '2026-11-01', time: '01:30' })
    .map((timestamp) => new Date(timestamp).toISOString()),
  ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z'],
  'fall-back wall time exposes both real instants in chronological order',
);

const nextSessions = createReplayNavigationCandidates({
  action: REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION,
  cursorTimestamp: '2026-05-04T05:00:00.000Z',
  endTimestamp: '2026-05-05T23:00:00.000Z',
  maxCandidates: 4,
});
assert.deepEqual(nextSessions.map(({ anchor, timestampIso }) => ({ anchor, timestampIso })), [
  { anchor: 'londonSession', timestampIso: '2026-05-04T06:00:00.000Z' },
  { anchor: 'newYorkSession', timestampIso: '2026-05-04T13:30:00.000Z' },
  { anchor: 'asianSession', timestampIso: '2026-05-04T23:00:00.000Z' },
  { anchor: 'londonSession', timestampIso: '2026-05-05T06:00:00.000Z' },
]);

const named = createReplayNavigationCandidates({
  action: REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
  cursorTimestamp: '2026-05-04T13:30:00.000Z',
  endTimestamp: '2026-05-06T13:30:00.000Z',
});
assert.deepEqual(named.map(({ timestampIso }) => timestampIso), [
  '2026-05-05T13:30:00.000Z',
  '2026-05-06T13:30:00.000Z',
]);

const dayOpen = createReplayNavigationCandidates({
  action: REPLAY_NAVIGATION_ACTIONS.NEXT_DAY_OPEN,
  cursorTimestamp: '2026-05-04T12:00:00.000Z',
  endTimestamp: '2026-05-04T21:59:00.000Z',
});
assert.deepEqual(dayOpen, [], 'session end bounds every generated candidate');

assert.throws(() => createReplayNavigationCandidates({
  action: 'arbitrary-date',
  cursorTimestamp: '2026-05-04T12:00:00.000Z',
  endTimestamp: '2026-05-05T12:00:00.000Z',
}), /unsupported/);

console.log('v6 replay navigation schedule step403 smoke passed');
