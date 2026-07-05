import assert from 'node:assert/strict';
import { createDefaultWallReplayState, advanceDefaultWallReplayState } from '../src/default-wall/default-wall-replay.js';
import {
  createDefaultWallPaneNextOperation,
  createDefaultWallPaneReplacePayload,
} from '../src/default-wall/default-wall-pane-projection.js';

const bars = Array.from({ length: 7 }, (_, index) => ({
  close: 100 + index + 0.5,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: 1780306200 + (index * 60),
}));

let state = createDefaultWallReplayState({
  bars,
  paneId: 'pane-mixed',
  prefixBars: 0,
  startIndex: 0,
});
state = advanceDefaultWallReplayState(state);
state = advanceDefaultWallReplayState(state);
state = advanceDefaultWallReplayState(state);
state = advanceDefaultWallReplayState(state);
state = advanceDefaultWallReplayState(state);

const oneMinuteReplace = createDefaultWallPaneReplacePayload(state, {
  displayTimeframe: 1,
  sourceTimeframe: 1,
});
assert.equal(oneMinuteReplace.bars.length, 6);
assert.deepEqual(oneMinuteReplace.bars.map((bar) => bar.timestamp), [
  1780306200,
  1780306260,
  1780306320,
  1780306380,
  1780306440,
  1780306500,
]);

const fiveMinuteReplace = createDefaultWallPaneReplacePayload(state, {
  displayTimeframe: 5,
  sourceTimeframe: 1,
});
assert.deepEqual(fiveMinuteReplace.bars.map((bar) => bar.timestamp), [
  1780306200,
  1780306500,
]);
assert.equal(fiveMinuteReplace.bars[0].open, 100);
assert.equal(fiveMinuteReplace.bars[0].close, 104.5);
assert.equal(fiveMinuteReplace.bars[1].open, 105);
assert.equal(fiveMinuteReplace.bars[1].close, 105.5);

const oneMinuteNext = createDefaultWallPaneNextOperation(state, {
  displayTimeframe: 1,
  sourceTimeframe: 1,
});
assert.equal(oneMinuteNext.operation, 'append');
assert.deepEqual(oneMinuteNext.payload.bars.map((bar) => bar.timestamp), [1780306500]);

const fiveMinuteNext = createDefaultWallPaneNextOperation(state, {
  displayTimeframe: 5,
  sourceTimeframe: 1,
});
assert.equal(fiveMinuteNext.operation, 'replace');
assert.deepEqual(fiveMinuteNext.payload.bars.map((bar) => bar.timestamp), [
  1780306200,
  1780306500,
]);

assert.throws(
  () => createDefaultWallPaneNextOperation(state, { displayTimeframe: 0 }),
  /displayTimeframe/,
);

console.log('v6 default wall pane projection smoke passed');
