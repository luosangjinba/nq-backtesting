import assert from 'node:assert/strict';
import { resolveDaySeparatorInstants } from '../src/session-calendar/session-calendar-domain.js';

const seconds = (iso) => Date.parse(iso) / 1000;
const spring = resolveDaySeparatorInstants({
  fromTimestamp: seconds('2026-03-08T00:00:00Z'),
  mode: 'both',
  toTimestamp: seconds('2026-03-09T23:59:59Z'),
});
assert.deepEqual(spring.map(({ timestamp, type }) => ({ timestamp, type })), [
  { timestamp: seconds('2026-03-08T00:00:00Z'), type: 'ict' },
  { timestamp: seconds('2026-03-08T18:00:00Z'), type: 'trading' },
  { timestamp: seconds('2026-03-09T00:00:00Z'), type: 'ict' },
  { timestamp: seconds('2026-03-09T18:00:00Z'), type: 'trading' },
]);

const fall = resolveDaySeparatorInstants({
  fromTimestamp: seconds('2026-11-01T00:00:00Z'),
  mode: 'both',
  toTimestamp: seconds('2026-11-02T23:59:59Z'),
});
assert.deepEqual(fall.map(({ timestamp, type }) => ({ timestamp, type })), [
  { timestamp: seconds('2026-11-01T00:00:00Z'), type: 'ict' },
  { timestamp: seconds('2026-11-01T18:00:00Z'), type: 'trading' },
  { timestamp: seconds('2026-11-02T00:00:00Z'), type: 'ict' },
  { timestamp: seconds('2026-11-02T18:00:00Z'), type: 'trading' },
]);

assert.deepEqual(resolveDaySeparatorInstants({
  fromTimestamp: seconds('2026-03-08T00:00:00Z'),
  mode: 'off',
  toTimestamp: seconds('2026-03-09T23:59:59Z'),
}), []);
assert.throws(() => resolveDaySeparatorInstants({
  fromTimestamp: 2,
  mode: 'daily',
  toTimestamp: 1,
}), /mode is unsupported/);

console.log('V6 Session Calendar day separators Step 412 smoke passed.');
