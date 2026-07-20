import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSessionHoursCalendar,
  createSessionHoursPolicy,
  decodeExchangeWallClock,
  evaluateSessionHours,
  resolveEligibleTraversal,
  resolveVisibleThrough,
} from '../src/session-hours-domain/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/session-hours-domain/negative/cases.json',
), 'utf8'));
const interval = (startMinute, endMinute) => ({ startMinute, endMinute });
const SOURCE = Object.freeze({
  retrievedDate: '2026-07-20',
  url: 'https://www.cmegroup.com/trading-hours.html',
});

function weeklySchedule() {
  const closed = () => [];
  return {
    eth: [
      [interval(1080, 1440)],
      [interval(0, 1020), interval(1080, 1440)],
      [interval(0, 1020), interval(1080, 1440)],
      [interval(0, 1020), interval(1080, 1440)],
      [interval(0, 1020), interval(1080, 1440)],
      [interval(0, 1020)],
      closed(),
    ],
    rth: [closed(), ...Array.from({ length: 5 }, () => [interval(570, 975)]), closed()],
  };
}

function exception(wallDate, kind, eligibleIntervals, overrides = {}) {
  return {
    calendarRevision: 'cme-equity-index-2026-r1',
    eligibleIntervals,
    kind,
    source: SOURCE,
    verification: kind === 'source-unavailable' ? 'unverified' : 'verified',
    wallDate,
    ...overrides,
  };
}

function calendarInput(overrides = {}) {
  return {
    schemaVersion: 1,
    exceptions: [
      exception('2026-04-03', 'early-close', {
        eth: [interval(0, 555)],
        rth: [],
      }),
      exception('2026-06-19', 'early-close', {
        eth: [interval(0, 780)],
        rth: [interval(570, 780)],
      }),
      exception('2026-07-03', 'source-unavailable', null),
    ],
    revision: 'cme-equity-index-2026-r1',
    supportedInstrumentIds: ['cme.nq', 'cme.es'],
    wallClockEncoding: 'exchange-wall-clock-utc-like',
    weeklySchedule: weeklySchedule(),
    ...overrides,
  };
}

const calendar = createSessionHoursCalendar(calendarInput());
const epoch = (label) => Date.parse(`${label}:00Z`);
const evaluate = (label, mode = 'eth', instrumentId = 'cme.nq') => evaluateSessionHours({
  calendar,
  instrumentId,
  mode,
  startEpochMs: epoch(label),
});

function assertEligible(label, mode, expected) {
  assert.equal(evaluate(label, mode).eligible, expected, `${label} ${mode}`);
}

assertEligible('2026-06-07T17:59', 'eth', false);
assertEligible('2026-06-07T18:00', 'eth', true);
assertEligible('2026-06-08T16:59', 'eth', true);
assertEligible('2026-06-08T17:00', 'eth', false);
assertEligible('2026-06-08T18:00', 'eth', true);
assertEligible('2026-06-12T16:59', 'eth', true);
assertEligible('2026-06-12T17:00', 'eth', false);
assertEligible('2026-06-13T09:30', 'eth', false);
assertEligible('2026-06-08T09:29', 'rth', false);
assertEligible('2026-06-08T09:30', 'rth', true);
assertEligible('2026-06-08T16:14', 'rth', true);
assertEligible('2026-06-08T16:15', 'rth', false);
assert.equal(evaluate('2026-06-08T09:30', 'rth', 'cme.es').eligible, true);

for (const label of ['2026-03-05T18:00', '2026-03-09T18:00', '2026-10-29T18:00', '2026-11-02T18:00']) {
  assertEligible(label, 'eth', true);
}
assert.deepEqual(decodeExchangeWallClock(epoch('2026-03-09T09:30')), {
  date: '2026-03-09', dayOfWeek: 1, minuteOfDay: 570,
});

assertEligible('2026-06-19T12:59', 'eth', true);
assertEligible('2026-06-19T13:00', 'eth', false);
assertEligible('2026-06-19T18:00', 'eth', false);
assertEligible('2026-06-19T12:59', 'rth', true);
assertEligible('2026-06-19T13:00', 'rth', false);
assertEligible('2026-04-03T09:14', 'eth', true);
assertEligible('2026-04-03T09:15', 'eth', false);
assertEligible('2026-04-03T09:30', 'rth', false);
const unavailable = evaluate('2026-07-03T09:30', 'rth');
assert.equal(unavailable.eligible, true, 'unverified source state must not synthesize closure');
assert.equal(unavailable.exceptionKind, 'source-unavailable');
assert.equal(unavailable.verification, 'unverified');

const sourceEpochs = [
  epoch('2026-06-08T16:14'),
  epoch('2026-06-08T18:00'),
  epoch('2026-06-09T03:00'),
  epoch('2026-06-09T09:30'),
  epoch('2026-06-09T09:31'),
];
assert.equal(resolveVisibleThrough({
  calendar,
  exclusiveCursorEpochMs: epoch('2026-06-09T03:01'),
  instrumentId: 'cme.nq',
  mode: 'rth',
  sourceEpochs,
}), epoch('2026-06-08T16:14'));
assert.equal(resolveEligibleTraversal({
  calendar,
  direction: 'next',
  fromEpochMs: epoch('2026-06-09T03:00'),
  instrumentId: 'cme.nq',
  mode: 'rth',
  sourceEpochs,
}), epoch('2026-06-09T09:30'));
assert.equal(resolveEligibleTraversal({
  calendar,
  direction: 'previous',
  fromEpochMs: epoch('2026-06-09T03:00'),
  instrumentId: 'cme.nq',
  mode: 'rth',
  sourceEpochs,
}), epoch('2026-06-08T16:14'));
assert.equal(resolveEligibleTraversal({
  calendar, direction: 'next', fromEpochMs: epoch('2026-06-09T09:31'),
  instrumentId: 'cme.nq', mode: 'rth', sourceEpochs,
}), null, 'traversal must not invent an eligible source bar');

const policy = createSessionHoursPolicy({ calendar, id: 'cme.rth', mode: 'rth' });
assert.deepEqual(Object.keys(policy).sort(), ['deterministic', 'id', 'isEligible', 'revision']);
assert.equal(Object.isFrozen(policy), true);
assert.equal(policy.deterministic, true);
assert.equal(policy.isEligible(
  { startEpochMs: epoch('2026-06-08T09:30') },
  { instrument: { id: 'cme.nq' } },
), true);

function errorCode(action) {
  try {
    action();
    return null;
  } catch (error) {
    return error.code;
  }
}

const invalidInterval = weeklySchedule();
invalidInterval.eth[1] = [interval(0, 100), interval(99, 200)];
const mismatched = exception('2026-01-01', 'closed', { eth: [], rth: [] }, {
  calendarRevision: 'other-r1',
});
const duplicate = exception('2026-06-19', 'closed', { eth: [], rth: [] });
const negativeActions = {
  'unknown-calendar-field': () => createSessionHoursCalendar({ ...calendarInput(), extra: true }),
  'unsupported-encoding': () => createSessionHoursCalendar({ ...calendarInput(), wallClockEncoding: 'iana-instant' }),
  'duplicate-instrument': () => createSessionHoursCalendar({ ...calendarInput(), supportedInstrumentIds: ['cme.nq', 'cme.nq'] }),
  'short-week': () => createSessionHoursCalendar({ ...calendarInput(), weeklySchedule: { ...weeklySchedule(), eth: [] } }),
  'overlapping-interval': () => createSessionHoursCalendar({ ...calendarInput(), weeklySchedule: invalidInterval }),
  'exception-revision-mismatch': () => createSessionHoursCalendar({ ...calendarInput(), exceptions: [mismatched] }),
  'duplicate-exception-date': () => createSessionHoursCalendar({ ...calendarInput(), exceptions: [...calendarInput().exceptions, duplicate] }),
  'unverified-override': () => createSessionHoursCalendar({
    ...calendarInput(),
    exceptions: [exception('2026-01-02', 'closed', { eth: [], rth: [] }, { verification: 'unverified' })],
  }),
  'invalid-mode': () => evaluateSessionHours({ calendar, instrumentId: 'cme.nq', mode: 'all', startEpochMs: 1 }),
  'unsupported-instrument': () => evaluateSessionHours({ calendar, instrumentId: 'cme.mnq', mode: 'eth', startEpochMs: 1 }),
  'invalid-epoch': () => evaluateSessionHours({ calendar, instrumentId: 'cme.nq', mode: 'eth', startEpochMs: 1.5 }),
  'out-of-range-epoch': () => evaluateSessionHours({
    calendar, instrumentId: 'cme.nq', mode: 'eth', startEpochMs: Number.MAX_SAFE_INTEGER,
  }),
  'forged-calendar': () => evaluateSessionHours({
    calendar: Object.freeze({ ...calendar }), instrumentId: 'cme.nq', mode: 'eth', startEpochMs: 1,
  }),
  'unordered-source': () => resolveVisibleThrough({
    calendar, exclusiveCursorEpochMs: 3, instrumentId: 'cme.nq', mode: 'eth', sourceEpochs: [2, 1],
  }),
  'duplicate-source': () => resolveVisibleThrough({
    calendar, exclusiveCursorEpochMs: 3, instrumentId: 'cme.nq', mode: 'eth', sourceEpochs: [1, 1],
  }),
  'invalid-direction': () => resolveEligibleTraversal({
    calendar, direction: 'forward', fromEpochMs: 1, instrumentId: 'cme.nq', mode: 'eth', sourceEpochs: [],
  }),
};

for (const fixture of negativeCases) {
  assert.equal(errorCode(negativeActions[fixture.case]), fixture.expectedCode, fixture.case);
}

console.log('session-hours-domain-harness: PASS');
