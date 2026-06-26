import assert from 'node:assert/strict';
import {
  isReplayFirstPrimaryRange,
  resolveReplayFirstComparisonRange,
} from '../src/ui/comparison/comparison-replay-load-policy.js';

const outerRange = {
  start: '2012-01-01 00:00',
  end: '2012-12-31 23:59',
  timeframe: 1,
};
const replayState = {
  enabled: true,
  cursorTimestamp: 1325503800,
};

assert.equal(isReplayFirstPrimaryRange({ primaryTimeframe: 1, outerRange, replayState }), true);
assert.equal(isReplayFirstPrimaryRange({ primaryTimeframe: 60, outerRange, replayState }), false);
assert.equal(isReplayFirstPrimaryRange({ primaryTimeframe: 1, outerRange, replayState: { enabled: false } }), false);

const oneMinuteRange = resolveReplayFirstComparisonRange({
  primaryTimeframe: 1,
  comparisonTimeframe: 1,
  outerRange,
  replayState,
});
assert.equal(oneMinuteRange.start, '2012-01-02 09:30');
assert.equal(oneMinuteRange.end, '2012-01-02 13:31');
assert.equal(oneMinuteRange.replayFirstBounded, true);

const hourlyRange = resolveReplayFirstComparisonRange({
  primaryTimeframe: 1,
  comparisonTimeframe: 60,
  outerRange,
  replayState,
});
assert.equal(hourlyRange.start, '2012-01-02 09:30');
assert.equal(hourlyRange.end, '2012-01-02 14:30');

console.log('comparison replay load policy smoke passed');
