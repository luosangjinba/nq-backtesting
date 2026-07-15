import assert from 'node:assert/strict';
import { resolvePlaybackPeriodStepCount } from '../src/chart-entry/chart-entry-playback-period-policy.js';

assert.equal(resolvePlaybackPeriodStepCount({
  playbackPeriod: '1m',
  sourceTimeframe: '1m',
}), 1);
assert.equal(resolvePlaybackPeriodStepCount({
  playbackPeriod: '30s',
  sourceTimeframe: '1m',
}), 1);
assert.equal(resolvePlaybackPeriodStepCount({
  playbackPeriod: '3m',
  sourceTimeframe: '1m',
}), 3);
assert.equal(resolvePlaybackPeriodStepCount({
  cursorTimestamp: Date.parse('2026-02-16T11:01:00Z') / 1000,
  direction: 'next',
  playbackPeriod: '5m',
  sourceTimeframe: '1m',
}), 4);
assert.equal(resolvePlaybackPeriodStepCount({
  cursorTimestamp: Date.parse('2026-02-16T11:01:00Z') / 1000,
  direction: 'previous',
  playbackPeriod: '5m',
  sourceTimeframe: '1m',
}), 1);
assert.equal(resolvePlaybackPeriodStepCount({
  cursorTimestamp: Date.parse('2026-02-16T11:05:00Z') / 1000,
  direction: 'next',
  playbackPeriod: '5m',
  sourceTimeframe: '1m',
}), 5);
assert.equal(resolvePlaybackPeriodStepCount({
  cursorTimestamp: Date.parse('2026-02-16T11:05:00Z') / 1000,
  direction: 'previous',
  playbackPeriod: '5m',
  sourceTimeframe: '1m',
}), 5);
assert.equal(resolvePlaybackPeriodStepCount({
  playbackPeriod: '1h',
  sourceTimeframe: '5m',
}), 12);
assert.throws(
  () => resolvePlaybackPeriodStepCount({
    playbackPeriod: '2d',
    sourceTimeframe: '1m',
  }),
  /Unsupported chart entry playback period/,
);

console.log('v6 chart entry playback period policy smoke passed');
