import assert from 'node:assert/strict';
import {
  DEFAULT_DISPLAY_TIMEZONE,
  DEFAULT_EXCHANGE_TIMEZONE,
  DISPLAY_TIMEZONE_COMMANDS,
  DISPLAY_TIMEZONE_EVENTS,
  DISPLAY_TIMEZONES,
} from '../src/contracts/timezone-contracts.js';
import {
  canonicalTimestampToInstantMs,
  displayWallClockToCanonicalTimestamp,
  formatDisplayDate,
  formatDisplayDateFromParts,
  formatDisplayTimestamp,
  resolveDisplayTimezone,
} from '../src/domain/timezone-format.js';

const canonicalNewYork0930Summer = Date.parse('2026-06-01T09:30:00.000Z') / 1000;
const canonicalNewYork0930Winter = Date.parse('2026-01-05T09:30:00.000Z') / 1000;

assert.equal(DISPLAY_TIMEZONE_COMMANDS.SET, 'displayTimezone.set');
assert.equal(DISPLAY_TIMEZONE_COMMANDS.GET, 'displayTimezone.get');
assert.equal(DISPLAY_TIMEZONE_EVENTS.CHANGED, 'displayTimezone:changed');
assert.equal(DEFAULT_DISPLAY_TIMEZONE, DISPLAY_TIMEZONES.EXCHANGE);
assert.equal(DEFAULT_EXCHANGE_TIMEZONE, 'America/New_York');
assert.equal(resolveDisplayTimezone(DISPLAY_TIMEZONES.EXCHANGE), 'America/New_York');
assert.equal(resolveDisplayTimezone(DISPLAY_TIMEZONES.UTC), 'UTC');

assert.equal(
  new Date(canonicalTimestampToInstantMs(canonicalNewYork0930Summer)).toISOString(),
  '2026-06-01T13:30:00.000Z'
);
assert.equal(
  new Date(canonicalTimestampToInstantMs(canonicalNewYork0930Winter)).toISOString(),
  '2026-01-05T14:30:00.000Z'
);

assert.equal(
  formatDisplayTimestamp(canonicalNewYork0930Summer, { displayTimezone: DISPLAY_TIMEZONES.EXCHANGE }),
  '2026-06-01 09:30'
);
assert.equal(
  formatDisplayTimestamp('2026-06-01 09:30', { displayTimezone: DISPLAY_TIMEZONES.EXCHANGE }),
  '2026-06-01 09:30'
);
assert.equal(
  formatDisplayTimestamp(canonicalNewYork0930Summer, { displayTimezone: DISPLAY_TIMEZONES.UTC }),
  '2026-06-01 13:30'
);
assert.equal(
  formatDisplayTimestamp(canonicalNewYork0930Summer, { displayTimezone: DISPLAY_TIMEZONES.LOS_ANGELES }),
  '2026-06-01 06:30'
);
assert.equal(
  formatDisplayTimestamp(canonicalNewYork0930Winter, { displayTimezone: DISPLAY_TIMEZONES.UTC }),
  '2026-01-05 14:30'
);
assert.equal(
  formatDisplayTimestamp(canonicalNewYork0930Summer, {
    displayTimezone: DISPLAY_TIMEZONES.EXCHANGE,
    dateFormat: "MMM DD 'YY",
    showDayOfWeekLabels: true,
  }),
  "Mon Jun 01 '26 09:30"
);
assert.equal(
  formatDisplayDate(canonicalNewYork0930Summer, {
    displayTimezone: DISPLAY_TIMEZONES.EXCHANGE,
    dateFormat: "DD MMM 'YY",
    showDayOfWeekLabels: true,
  }),
  "Mon 01 Jun '26"
);
assert.equal(
  formatDisplayDateFromParts({
    year: 2026,
    month: 6,
    day: 1,
  }, {
    dateFormat: 'YYYY-MM-DD',
    showDayOfWeekLabels: true,
    compactIso: true,
  }),
  'Mon 06-01'
);

assert.equal(
  displayWallClockToCanonicalTimestamp('2026-06-01T09:30', {
    displayTimezone: DISPLAY_TIMEZONES.EXCHANGE,
  }),
  '2026-06-01T09:30:00.000Z'
);
assert.equal(
  displayWallClockToCanonicalTimestamp('2026-06-01T13:30', {
    displayTimezone: DISPLAY_TIMEZONES.UTC,
  }),
  '2026-06-01T09:30:00.000Z'
);
assert.equal(
  displayWallClockToCanonicalTimestamp('2026-06-01T06:30', {
    displayTimezone: DISPLAY_TIMEZONES.LOS_ANGELES,
  }),
  '2026-06-01T09:30:00.000Z'
);

console.log('v5 timezone contracts smoke passed');
