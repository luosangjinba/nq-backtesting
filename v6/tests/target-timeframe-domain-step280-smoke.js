import assert from 'node:assert/strict';
import {
  TARGET_TIMEFRAME_BUCKET_TYPES,
  findTargetTimeframeRecord,
  fixedMinutesToTargetTimeframeId,
  getSupportedTargetTimeframeIds,
  getTargetTimeframeRecords,
  isFixedDurationTargetTimeframe,
  isSessionAwareTargetTimeframe,
  isTargetTimeframeSupported,
  normalizeTargetTimeframeId,
  targetTimeframeToApiCacheKey,
  targetTimeframeToAlignmentOffsetSeconds,
  targetTimeframeToFixedMinutes,
  targetTimeframeToRuntimeValue,
} from '../src/time-domain/target-timeframe-domain.js';

assert.deepEqual(getSupportedTargetTimeframeIds(), [
  '1m',
  '2m',
  '3m',
  '4m',
  '5m',
  '10m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '8h',
  '12h',
  '1D',
  '1W',
  '1M',
]);

assert.equal(normalizeTargetTimeframeId(1), '1m');
assert.equal(normalizeTargetTimeframeId('1'), '1m');
assert.equal(normalizeTargetTimeframeId('1m'), '1m');
assert.equal(normalizeTargetTimeframeId('1H'), '1h');
assert.equal(normalizeTargetTimeframeId('8h'), '8h');
assert.equal(normalizeTargetTimeframeId('12H'), '12h');
assert.equal(normalizeTargetTimeframeId('1d'), '1D');
assert.equal(normalizeTargetTimeframeId('1w'), '1W');
assert.equal(normalizeTargetTimeframeId('1M'), '1M');

assert.equal(isTargetTimeframeSupported('45m'), false);
assert.equal(isTargetTimeframeSupported('30s'), false);
assert.throws(() => normalizeTargetTimeframeId('45m'), /supported target timeframe/);
assert.throws(() => normalizeTargetTimeframeId('30s'), /supported target timeframe/);

assert.equal(isFixedDurationTargetTimeframe('8h'), true);
assert.equal(isFixedDurationTargetTimeframe('1D'), false);
assert.equal(isSessionAwareTargetTimeframe('1D'), true);
assert.equal(isSessionAwareTargetTimeframe('1W'), true);
assert.equal(isSessionAwareTargetTimeframe('1M'), true);
assert.equal(isSessionAwareTargetTimeframe('4h'), false);

assert.deepEqual(findTargetTimeframeRecord('4h'), {
  bucketType: TARGET_TIMEFRAME_BUCKET_TYPES.FIXED_DURATION,
  id: '4h',
  minutes: 240,
  runtimeValue: 240,
  sourceAuthority: 'target-or-source-derived',
});
assert.deepEqual(findTargetTimeframeRecord('1D'), {
  bucketType: TARGET_TIMEFRAME_BUCKET_TYPES.SESSION_AWARE,
  id: '1D',
  minutes: null,
  runtimeValue: '1D',
  sourceAuthority: 'session-calendar',
});

assert.equal(targetTimeframeToRuntimeValue('30m'), 30);
assert.equal(targetTimeframeToRuntimeValue('1h'), 60);
assert.equal(targetTimeframeToRuntimeValue('1D'), '1D');
assert.equal(targetTimeframeToApiCacheKey(' 8H '), '8h');
assert.equal(targetTimeframeToApiCacheKey('1m'), '1m');
assert.equal(targetTimeframeToAlignmentOffsetSeconds('1h'), 0);
assert.equal(targetTimeframeToAlignmentOffsetSeconds('4h'), 7200);
assert.equal(targetTimeframeToAlignmentOffsetSeconds('1D'), null);
assert.equal(targetTimeframeToFixedMinutes('12h'), 720);
assert.equal(targetTimeframeToFixedMinutes('1W'), null);
assert.equal(fixedMinutesToTargetTimeframeId(480), '8h');
assert.equal(fixedMinutesToTargetTimeframeId(45), null);

const records = getTargetTimeframeRecords();
assert.throws(() => {
  records[0].id = 'mutated';
}, /read only property/);
assert.equal(getTargetTimeframeRecords()[0].id, '1m');

console.log('v6 target timeframe domain step280 smoke passed');
