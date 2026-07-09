import assert from 'node:assert/strict';
import {
  assertDisplayTimeframeMultiple,
  normalizeMinuteTimeframe,
  normalizeOptionalUnixSeconds,
  normalizeUnixMilliseconds,
  normalizeUnixSeconds,
  resolveDisplayBucketStart,
  summarizeProjectionSource,
  TIME_DOMAIN_CONSTANTS,
  toApiMinuteTime,
  unixMillisecondsToSeconds,
} from '../src/time-domain/time-domain.js';

const start = Date.parse('2026-05-31T18:00:00Z') / 1000;

assert.equal(TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS, 60);
assert.equal(TIME_DOMAIN_CONSTANTS.MINUTE_MS, 60_000);

assert.equal(normalizeMinuteTimeframe('15m'), 15);
assert.equal(normalizeMinuteTimeframe('15'), 15);
assert.equal(normalizeMinuteTimeframe(5, { allowSuffix: false }), 5);
assert.throws(() => normalizeMinuteTimeframe('1h'), /minute-based/);
assert.throws(() => normalizeMinuteTimeframe('0m'), /positive minute value/);

assert.equal(normalizeUnixSeconds(start), start);
assert.equal(normalizeUnixSeconds(start * 1000), start);
assert.equal(normalizeUnixSeconds('2026-05-31 18:00:00'), start);
assert.equal(normalizeUnixSeconds('2026-05-31T18:00:00Z'), start);
assert.equal(normalizeOptionalUnixSeconds(null), null);
assert.throws(() => normalizeUnixSeconds(''), /valid timestamp/);

assert.equal(normalizeUnixMilliseconds(start), start * 1000);
assert.equal(normalizeUnixMilliseconds(start * 1000), start * 1000);
assert.equal(normalizeUnixMilliseconds('2026-05-31 18:00:00'), start * 1000);
assert.equal(unixMillisecondsToSeconds(100_999), 100);
assert.equal(toApiMinuteTime(start * 1000), '2026-05-31 18:00');

assert.deepEqual(
  assertDisplayTimeframeMultiple({ sourceTimeframe: 1, targetTimeframe: 15 }),
  {
    expectedSourceBars: 15,
    source: 1,
    sourceSeconds: 60,
    target: 15,
    targetSeconds: 900,
  },
);
assert.throws(
  () => assertDisplayTimeframeMultiple({ sourceTimeframe: 5, targetTimeframe: 1 }),
  /multiple/,
);

assert.equal(resolveDisplayBucketStart({
  originTimestamp: start,
  targetTimeframe: 15,
  timestamp: start + (17 * 60),
}), start + (15 * 60));

assert.deepEqual(summarizeProjectionSource({
  buckets: [{}, {}],
  projectionRevision: 7,
  sourceBarCount: 30,
  sourceTimeframe: 1,
  targetTimeframe: 15,
}), {
  bucketCount: 2,
  owner: 'runtime.chart-data-projection',
  projectionRevision: 7,
  sourceBarCount: 30,
  sourceTimeframe: 1,
  targetTimeframe: 15,
});
assert.equal(summarizeProjectionSource(null), null);

console.log('v6 time domain helper step 215 smoke passed');
