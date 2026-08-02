import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CalendarTimeframeDomainError,
  createCalendarAggregationPolicy,
  projectCalendarBars,
  resolveCalendarPeriod,
} from '../src/calendar-timeframe-domain/public.js';
import { findConcreteCapabilityIdBranches } from './support/capability-source-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/calendar-timeframe-domain/negative/cases.json',
), 'utf8'));
const MINUTE = 60_000;
const at = (value) => Date.parse(`${value}Z`);
const bar = (startEpochMs, price, volume = 10) => Object.freeze({
  close: price + 1,
  high: price + 2,
  low: price - 2,
  open: price,
  startEpochMs,
  volume,
});

function eligible(mode, wallEpochMs) {
  const value = new Date(wallEpochMs);
  const day = value.getUTCDay();
  const minute = (value.getUTCHours() * 60) + value.getUTCMinutes();
  if (mode === 'rth') return day >= 1 && day <= 5 && minute >= 570 && minute < 975;
  return (day === 0 && minute >= 1080)
    || (day >= 1 && day <= 4 && (minute < 1020 || minute >= 1080))
    || (day === 5 && minute < 1020);
}

function configuration(period, mode) {
  return Object.freeze({
    isEligibleWallEpoch: (wallEpochMs) => eligible(mode, wallEpochMs),
    period,
    rollsToNextTradingDay: mode === 'eth',
    sessionStartMinute: mode === 'eth' ? 1080 : 570,
    sourceDurationMs: MINUTE,
    toInstantEpochMs: (wallEpochMs) => wallEpochMs,
    toWallEpochMs: (epochMs) => epochMs,
  });
}

const monday = resolveCalendarPeriod({
  period: 'day',
  rollsToNextTradingDay: true,
  sessionStartMinute: 1080,
  wallEpochMs: at('2026-05-03T18:00:00'),
});
assert.equal(monday.wallStartEpochMs, at('2026-05-03T18:00:00'));
assert.equal(monday.nextWallStartEpochMs, at('2026-05-04T18:00:00'));

const ethDaily = projectCalendarBars({
  bars: [
    bar(at('2026-05-03T18:00:00'), 100),
    bar(at('2026-05-04T09:30:00'), 104),
    bar(at('2026-05-04T16:59:00'), 102),
    bar(at('2026-05-04T18:00:00'), 110),
  ],
  ...configuration('day', 'eth'),
});
assert.deepEqual(ethDaily, [
  {
    close: 103,
    displayEpochMs: at('2026-05-04T16:59:00'),
    high: 106,
    labelDate: '2026-05-04',
    low: 98,
    open: 100,
    startEpochMs: at('2026-05-03T18:00:00'),
    volume: 30,
  },
  {
    close: 111,
    displayEpochMs: at('2026-05-05T16:59:00'),
    high: 112,
    labelDate: '2026-05-05',
    low: 108,
    open: 110,
    startEpochMs: at('2026-05-04T18:00:00'),
    volume: 10,
  },
], 'ETH daily bars must use the prior 18:00 wall open and stable 16:59 completion slot');

const rthDaily = projectCalendarBars({
  bars: [bar(at('2026-05-04T09:30:00'), 200), bar(at('2026-05-04T12:00:00'), 205)],
  ...configuration('day', 'rth'),
});
assert.equal(rthDaily[0].startEpochMs, at('2026-05-04T09:30:00'));
assert.equal(rthDaily[0].displayEpochMs, at('2026-05-04T16:14:00'));
assert.equal(rthDaily[0].labelDate, '2026-05-04');

const ethWeekly = projectCalendarBars({
  bars: [bar(at('2026-05-03T18:00:00'), 300), bar(at('2026-05-08T16:59:00'), 310)],
  ...configuration('week', 'eth'),
});
assert.equal(ethWeekly[0].startEpochMs, at('2026-05-03T18:00:00'));
assert.equal(ethWeekly[0].displayEpochMs, at('2026-05-08T16:59:00'));
assert.equal(ethWeekly[0].labelDate, '2026-05-04');

const ethMonthly = projectCalendarBars({
  bars: [bar(at('2026-05-31T18:00:00'), 400), bar(at('2026-06-30T16:59:00'), 420)],
  ...configuration('month', 'eth'),
});
assert.equal(ethMonthly[0].startEpochMs, at('2026-05-31T18:00:00'));
assert.equal(ethMonthly[0].displayEpochMs, at('2026-06-30T16:59:00'));
assert.equal(ethMonthly[0].labelDate, '2026-06-01');

const policy = createCalendarAggregationPolicy({
  alignmentPolicyId: 'alignment.calendar-day',
  id: 'projection.calendar-day',
  isEligibleWallEpoch: (wallEpochMs) => eligible('eth', wallEpochMs),
  period: 'day',
  revision: 'calendar-day-eth-r1',
  rollsToNextTradingDay: true,
  schemaVersion: 1,
  sessionHoursMode: 'eth',
  sessionStartMinute: 1080,
  sourceDurationMs: MINUTE,
  toInstantEpochMs: (wallEpochMs) => wallEpochMs,
  toWallEpochMs: (epochMs) => epochMs,
});
const projected = policy.project([bar(at('2026-05-03T18:00:00'), 500, null)], {
  aggregationPolicyRevision: 'calendar-day-eth-r1',
  displayTimeframe: {
    aggregationPolicyId: 'projection.calendar-day',
    alignment: { kind: 'calendar', policyId: 'alignment.calendar-day' },
    sourceResolutionIds: ['resolution.fixed-1-minute'],
  },
  sessionHoursMode: 'eth',
  sourceResolutionId: 'resolution.fixed-1-minute',
});
assert.equal(projected[0].volume, null, 'unknown source volume must remain unknown');
assert.ok(Object.isFrozen(projected) && Object.isFrozen(projected[0]) && Object.isFrozen(policy));

const negativeActions = {
  'empty-source': () => projectCalendarBars({ bars: [], ...configuration('day', 'eth') }),
  'unordered-source': () => projectCalendarBars({
    bars: [bar(at('2026-05-04T09:31:00'), 1), bar(at('2026-05-04T09:30:00'), 2)],
    ...configuration('day', 'rth'),
  }),
  'unsupported-period': () => resolveCalendarPeriod({
    period: 'quarter', rollsToNextTradingDay: false, sessionStartMinute: 570, wallEpochMs: 1,
  }),
  'unsupported-version': () => createCalendarAggregationPolicy({
    alignmentPolicyId: 'alignment.calendar-day',
    id: 'projection.calendar-day',
    isEligibleWallEpoch: () => true,
    period: 'day',
    revision: 'r1',
    rollsToNextTradingDay: true,
    schemaVersion: 2,
    sessionHoursMode: 'eth',
    sessionStartMinute: 1080,
    sourceDurationMs: MINUTE,
    toInstantEpochMs: (value) => value,
    toWallEpochMs: (value) => value,
  }),
  'alignment-context-mismatch': () => policy.project([bar(at('2026-05-03T18:00:00'), 1)], {
    aggregationPolicyRevision: 'calendar-day-eth-r1',
    displayTimeframe: {
      aggregationPolicyId: 'projection.calendar-day',
      alignment: { kind: 'calendar', policyId: 'alignment.calendar-week' },
      sourceResolutionIds: ['resolution.fixed-1-minute'],
    },
    sessionHoursMode: 'eth',
    sourceResolutionId: 'resolution.fixed-1-minute',
  }),
};
for (const fixture of negativeCases) {
  assert.throws(negativeActions[fixture.case], (error) => (
    error instanceof CalendarTimeframeDomainError && error.code === fixture.expectedCode
  ), fixture.case);
}

const productionSources = fs.readdirSync(path.join(V7_ROOT, 'src/calendar-timeframe-domain'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/calendar-timeframe-domain', file), 'utf8'));
assert.deepEqual(
  productionSources.flatMap(findConcreteCapabilityIdBranches),
  [],
  'calendar timeframe policies must not branch on concrete capability ids',
);

console.log(`v7 calendar timeframe domain harness passed (${negativeCases.length} negative controls)`);
