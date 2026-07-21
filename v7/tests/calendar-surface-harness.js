import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDateTimeControl,
  formatLocalDateTimeValue,
  parseLocalDateTimeValue,
} from '../src/calendar-surface/public.js';
import {
  createDecadePage,
  createLocalDate,
  createMonthGrid,
} from '../src/calendar-surface/public.js';

assert.equal(Number.isNaN(parseLocalDateTimeValue('')), true, 'an empty control must stay empty');
assert.equal(Number.isNaN(parseLocalDateTimeValue('not-a-date')), true, 'invalid text must not become a Session epoch');

const minuteValue = '2026-07-20T09:31';
const minuteEpoch = parseLocalDateTimeValue(minuteValue);
assert.equal(Number.isFinite(minuteEpoch), true);
assert.equal(formatLocalDateTimeValue(minuteEpoch), minuteValue, 'minute precision must round-trip local wall time');

const secondValue = '2026-07-20T09:31:42';
const secondEpoch = parseLocalDateTimeValue(secondValue);
assert.equal(formatLocalDateTimeValue(secondEpoch, 'second'), secondValue,
  'the boundary must support future second-level controls without Session creation changes');

const newYorkSummerEpoch = parseLocalDateTimeValue('2026-05-01T12:40', 'America/New_York');
assert.equal(newYorkSummerEpoch, Date.parse('2026-05-01T16:40:00Z'),
  'New York Session input must not inherit the browser local timezone');
assert.equal(formatLocalDateTimeValue(newYorkSummerEpoch, 'minute', 'America/New_York'), '2026-05-01T12:40');
assert.equal(
  parseLocalDateTimeValue('2026-01-05T12:40', 'America/New_York'),
  Date.parse('2026-01-05T17:40:00Z'),
  'New York Session input must honor winter offset changes',
);
assert.equal(Number.isNaN(parseLocalDateTimeValue('2026-03-08T02:30', 'America/New_York')), true,
  'a nonexistent New York DST wall time must be rejected');

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/calendar-surface/negative/cases.json'),
  'utf8',
));
const negativeActions = Object.freeze({
  'non-finite-epoch': () => formatLocalDateTimeValue(Number.NaN),
  'unsupported-precision': () => formatLocalDateTimeValue(minuteEpoch, 'tick'),
  'unsupported-placement': () => createDateTimeControl({ name: 'start', placement: 'middle' }),
  'invalid-calendar-date': () => createLocalDate({ year: 2026, month: 1, day: 31 }),
});
for (const fixture of negativeCases) {
  assert.throws(negativeActions[fixture.action], new RegExp(fixture.expectedMessage), fixture.name);
}

const leapMonth = createMonthGrid({
  year: 2020, month: 1,
  selected: createLocalDate({ year: 2020, month: 1, day: 29 }),
  today: createLocalDate({ year: 2020, month: 1, day: 20 }),
});
assert.equal(leapMonth.length, 42, 'month view must always produce a stable six-week grid');
assert.deepEqual(leapMonth[0], {
  year: 2020, month: 0, day: 26, outside: true, selected: false, today: false,
});
assert.equal(leapMonth.find((day) => day.selected)?.day, 29, 'leap day must remain selectable');
assert.deepEqual(createDecadePage(2026), {
  start: 2020, end: 2029, years: [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029],
});
console.log('v7 Calendar Surface harness passed (value, month, decade, leap-day, negative controls)');
