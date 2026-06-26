import assert from 'node:assert/strict';
import {
  clampReplayCursor,
  createReplayRangeState,
  formatReplayTimestamp,
  isReplayFirstCandidate,
  normalizeReplayOuterRange,
  parseReplayDateTime,
} from '../src/data/replay-range-model.js';

assert.equal(normalizeReplayOuterRange(null), null);
assert.equal(normalizeReplayOuterRange(undefined), null);

assert.equal(parseReplayDateTime('2012-01-03 09:30'), 1325583000);
assert.equal(formatReplayTimestamp(1325583000), '2012-01-03 09:30');

const outer = normalizeReplayOuterRange({
  start: '2012-01-01 00:00',
  end: '2012-12-31 23:59',
  timeframe: 1,
});
assert.equal(outer.startTs, 1325376000);
assert.equal(outer.endTs, 1356998340);
assert.equal(outer.timeframe, 1);

assert.equal(clampReplayCursor(1, outer), outer.startTs);
assert.equal(clampReplayCursor(9999999999, outer), outer.endTs);
assert.equal(clampReplayCursor(1325583000, outer), 1325583000);

const state = createReplayRangeState({
  outerRange: outer,
  cursorTimestamp: 1,
  visibleBars: [{ timestamp: 1 }],
  loadedChunks: [{ start: 'a' }],
});
assert.equal(state.cursorTimestamp, outer.startTs);
assert.equal(state.visibleBars.length, 1);
assert.equal(state.loadedChunks.length, 1);

assert.equal(isReplayFirstCandidate('2012-01-01 00:00', '2012-12-31 23:59', 1), true);
assert.equal(isReplayFirstCandidate('2012-01-01 00:00', '2012-01-05 23:59', 1), false);
assert.equal(isReplayFirstCandidate('2012-01-01 00:00', '2012-12-31 23:59', 60), false);

console.log('replay range model smoke passed');
