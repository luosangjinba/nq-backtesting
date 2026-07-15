import assert from 'node:assert/strict';
import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
  REPLAY_NAVIGATION_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createReplayNavigationRuntime } from '../src/replay-navigation/replay-navigation-runtime.js';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';

clearCommandsForTest();
const calls = [];
let replayState = {
  cursorTime: '2026-05-06T14:00:00.000Z',
  sessionId: 'session-469',
  startTime: '2026-05-01T13:30:00.000Z',
  status: 'paused',
  symbol: 'NQ',
  timeframe: '1m',
};
registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({ ...replayState }));
registerCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, ({ cursorTime }) => {
  calls.push(['cursor', cursorTime]);
  replayState = { ...replayState, cursorTime };
  return { ...replayState };
});
registerCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP, () => calls.push(['stop']));
registerCommand(PANE_COMMANDS.LIST, () => [{ id: 'main' }, { id: 'context' }]);

const runtime = createReplayNavigationRuntime({
  replaceCursor: async ({ paneIds, replayState: replacementState }) => {
    calls.push(['replace', paneIds, replacementState.cursorTime]);
    return {
      chartRecords: paneIds.map((paneId) => ({ bars: [{ time: 1 }], paneId })),
      loadedWindows: paneIds.map((paneId) => ({ paneId, source: 'chart-data-filter' })),
      replacedBarCount: 2,
    };
  },
});
runtime.start();

const descriptor = {
  evidenceId: 'evidence-469',
  replaySessionId: 'session-469',
  replayVisibleThroughTime: '2026-05-03T14:30:00.000Z',
  trialId: 'trial-469',
};
const completed = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.DRILLBACK, { descriptor });
assert.equal(completed.status, 'completed');
assert.equal(completed.lastResult.action, 'evidence-drillback');
assert.deepEqual(completed.lastResult.paneIds, ['main', 'context']);
assert.equal(completed.lastResult.replacedBarCount, 2);
assert.deepEqual(calls, [
  ['stop'],
  ['cursor', '2026-05-03T14:30:00.000Z'],
  ['replace', ['main', 'context'], '2026-05-03T14:30:00.000Z'],
]);

const mismatch = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.DRILLBACK, {
  descriptor: { ...descriptor, replaySessionId: 'another-session' },
});
assert.equal(mismatch.status, 'rejected');
assert.equal(mismatch.lastResult.reason, 'replay-session-mismatch');
assert.equal(calls.length, 3);

const future = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.DRILLBACK, {
  descriptor: { ...descriptor, replayVisibleThroughTime: '2026-05-04T14:30:00.000Z' },
});
assert.equal(future.status, 'rejected');
assert.equal(future.lastResult.reason, 'future-evidence');
assert.equal(calls.length, 3);

runtime.stop();
console.log('v6 replay evidence drillback step469 smoke passed');
