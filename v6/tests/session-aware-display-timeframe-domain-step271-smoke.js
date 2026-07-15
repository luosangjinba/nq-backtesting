import assert from 'node:assert/strict';
import {
  SESSION_AWARE_DISPLAY_TIMEFRAME_VALUES,
  estimateSessionAwareSourceBarCount,
  formatDisplayTimeframeValue,
  isSessionAwareDisplayTimeframe,
  normalizeDisplayTimeframeValue,
  normalizeSessionAwareDisplayTimeframe,
} from '../src/time-domain/htf-display-timeframe-domain.js';

assert.deepEqual(SESSION_AWARE_DISPLAY_TIMEFRAME_VALUES, ['1D', '1W', '1M']);

for (const value of ['1d', ' 1W ', '1m']) {
  assert.equal(isSessionAwareDisplayTimeframe(value), true);
}
assert.equal(isSessionAwareDisplayTimeframe(15), false);

assert.equal(normalizeSessionAwareDisplayTimeframe('1d'), '1D');
assert.equal(normalizeSessionAwareDisplayTimeframe('1w'), '1W');
assert.equal(normalizeSessionAwareDisplayTimeframe('1m'), '1M');
assert.equal(normalizeSessionAwareDisplayTimeframe('15'), null);

assert.equal(normalizeDisplayTimeframeValue('15'), 15);
assert.equal(normalizeDisplayTimeframeValue('1D'), '1D');
assert.equal(normalizeDisplayTimeframeValue('1W'), '1W');
assert.equal(normalizeDisplayTimeframeValue('1M'), '1M');
assert.throws(() => normalizeDisplayTimeframeValue('bad'), /minute value/);

assert.equal(formatDisplayTimeframeValue(15), '15m');
assert.equal(formatDisplayTimeframeValue(60), '1h');
assert.equal(formatDisplayTimeframeValue(120), '2h');
assert.equal(formatDisplayTimeframeValue(240), '4h');
assert.equal(formatDisplayTimeframeValue('1D'), '1D');
assert.equal(formatDisplayTimeframeValue('1W'), '1W');
assert.equal(formatDisplayTimeframeValue('1M'), '1M');

assert.equal(estimateSessionAwareSourceBarCount({
  count: 2,
  sourceBarLimit: 2500,
  targetTimeframe: '1D',
}), 2500);
assert.equal(estimateSessionAwareSourceBarCount({
  count: 1,
  sourceBarLimit: 2500,
  targetTimeframe: '1D',
}), 1440);
assert.equal(estimateSessionAwareSourceBarCount({
  count: 1,
  sourceBarLimit: 2500,
  targetTimeframe: '1W',
}), 2500);
assert.equal(estimateSessionAwareSourceBarCount({
  count: 1,
  sourceBarLimit: 2500,
  targetTimeframe: '1M',
}), 2500);
assert.equal(estimateSessionAwareSourceBarCount({
  count: 2,
  sourceBarLimit: 2500,
  targetTimeframe: 15,
}), null);

console.log('v6 session-aware display timeframe domain step271 smoke passed');
