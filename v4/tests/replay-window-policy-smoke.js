import assert from 'node:assert/strict';
import { resolveReplayWindowAroundCursor } from '../src/data/replay-window-policy.js';

const outer = {
  start: '2012-01-01 00:00',
  end: '2012-12-31 23:59',
  timeframe: 1,
};

const middle = resolveReplayWindowAroundCursor(outer, 1325583000);
assert.equal(middle.ok, true);
assert.equal(middle.windowRange.start, '2012-01-02 09:30');
assert.equal(middle.windowRange.end, '2012-01-06 09:30');
assert.equal(middle.cursorTimestamp, 1325583000);

const leftClamped = resolveReplayWindowAroundCursor(outer, 1);
assert.equal(leftClamped.ok, true);
assert.equal(leftClamped.cursorTimestamp, 1325376000);
assert.equal(leftClamped.windowRange.start, '2012-01-01 00:00');
assert.equal(leftClamped.windowRange.end, '2012-01-04 00:00');

const rightClamped = resolveReplayWindowAroundCursor(outer, 9999999999);
assert.equal(rightClamped.ok, true);
assert.equal(rightClamped.cursorTimestamp, 1356998340);
assert.equal(rightClamped.windowRange.end, '2012-12-31 23:59');

const custom = resolveReplayWindowAroundCursor(outer, 1325583000, { leftDays: 0.5, rightDays: 0.5 });
assert.equal(custom.windowRange.start, '2012-01-02 21:30');
assert.equal(custom.windowRange.end, '2012-01-03 21:30');

console.log('replay window policy smoke passed');
