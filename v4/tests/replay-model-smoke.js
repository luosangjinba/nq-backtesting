import assert from 'node:assert/strict';
import {
  REPLAY_CONTROL_MODES,
  applyBeforeFirstPickState,
  applyReplaySliceState,
  clearReplayAfterSyncState,
  createLegacyReplayState,
  getReplayChangedPayload,
  getReplayRestoreSnapshotState,
  resetReplayStateFields,
  restoreFullChartState,
} from '../src/features/replay/replay-model.js';

const state = createLegacyReplayState({ timeframe: 1, speedIndex: 2 });
state.displayBars = [
  { timestamp: 100, open: 1, high: 2, low: 1, close: 2 },
  { timestamp: 160, open: 2, high: 3, low: 2, close: 3 },
];
state.chartData = [
  { time: 100, open: 1, high: 2, low: 1, close: 2 },
  { time: 160, open: 2, high: 3, low: 2, close: 3 },
];

applyReplaySliceState(state, 1);
assert.equal(state.enabled, true);
assert.equal(state.cursorIndex, 1);
assert.equal(state.mode, REPLAY_CONTROL_MODES.IDLE);
assert.deepEqual(getReplayChangedPayload(state), {
  enabled: true,
  cursorIndex: 1,
  cursorTimestamp: 160,
  speedIndex: 2,
});

const snapshot = getReplayRestoreSnapshotState(state, { from: 0, to: 1 });
assert.equal(snapshot.cursorTimestamp, 160);
assert.equal(snapshot.dataCount, 2);

restoreFullChartState(state, { savePosition: true });
assert.equal(state.enabled, false);
assert.equal(state.lastCursorIndex, 1);

applyBeforeFirstPickState(state);
assert.equal(state.enabled, true);
assert.equal(state.cursorIndex, -1);

clearReplayAfterSyncState(state);
assert.equal(state.enabled, false);
assert.equal(state.cursorIndex, -1);
assert.equal(state.lastCursorIndex, -1);

resetReplayStateFields(state);
assert.equal(state.mode, REPLAY_CONTROL_MODES.IDLE);

console.log('replay model smoke passed');
