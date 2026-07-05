import assert from 'node:assert/strict';
import {
  advanceDefaultWallReplayState,
  createDefaultWallChartAppendPayload,
  createDefaultWallChartReplacePayload,
  createDefaultWallReplayState,
} from '../src/default-wall/default-wall-replay.js';

const bars = Array.from({ length: 8 }, (_, index) => ({
  close: 100 + index + 0.5,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: 1780306200 + (index * 60),
})).reverse();

const initial = createDefaultWallReplayState({
  bars,
  latestOffsetBars: 3,
  paneId: 'pane-1',
  prefixBars: 2,
  spanBars: 6,
  startIndex: 3,
});

assert.equal(initial.paneId, 'pane-1');
assert.equal(initial.cursorIndex, 3);
assert.deepEqual(initial.chartBars.map((bar) => bar.timestamp), [
  1780306260,
  1780306320,
  1780306380,
]);
assert.equal(initial.forwardBars.length, 4);
assert.deepEqual(initial.projection, {
  from: -1,
  latestLogicalIndex: 2,
  latestOffsetBars: 3,
  origin: 'default',
  spanBars: 6,
  to: 5,
});

const replacePayload = createDefaultWallChartReplacePayload(initial);
assert.equal(replacePayload.paneId, 'pane-1');
assert.equal(replacePayload.cursorTimestamp, 1780306380);
assert.equal(replacePayload.bars.length, 3);

const advanced = advanceDefaultWallReplayState(initial);
assert.equal(advanced.cursorIndex, 4);
assert.equal(advanced.latestBar.timestamp, 1780306440);
assert.deepEqual(advanced.chartBars.map((bar) => bar.timestamp), [
  1780306260,
  1780306320,
  1780306380,
  1780306440,
]);
assert.deepEqual(advanced.projection, {
  from: 0,
  latestLogicalIndex: 3,
  latestOffsetBars: 3,
  origin: 'default',
  spanBars: 6,
  to: 6,
});

const appendPayload = createDefaultWallChartAppendPayload(advanced);
assert.equal(appendPayload.cursorTimestamp, 1780306440);
assert.deepEqual(appendPayload.bars.map((bar) => bar.timestamp), [1780306440]);

const exhausted = [1, 2, 3, 4].reduce((state) => advanceDefaultWallReplayState(state), advanced);
const unchanged = advanceDefaultWallReplayState(exhausted);
assert.equal(unchanged.cursorIndex, exhausted.cursorIndex);
assert.equal(unchanged.forwardBars.length, 0);
assert.equal(unchanged.chartBars.length, exhausted.chartBars.length);

console.log('v6 default wall replay domain smoke passed');
