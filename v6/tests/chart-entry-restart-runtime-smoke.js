import assert from 'node:assert/strict';
import {
  CHART_ENTRY_RESTART_COMMANDS,
  CHART_ENTRY_RESTART_EVENTS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartEntryRestartRuntime } from '../src/chart-entry/chart-entry-restart-runtime.js';
import { clearCommandsForTest, dispatchCommand, hasCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const replayState = Object.freeze({
  cursorTime: '2026-06-01T09:34:00.000Z',
  endTime: '2026-06-01T10:00:00.000Z',
  sessionId: 'session-restart',
  startTime: '2026-06-01T09:30:00.000Z',
  timeframe: '1m',
});
const calls = [];
const events = [];
const runtime = createChartEntryRestartRuntime({
  dispatchCommand: async (command, payload) => {
    calls.push([command, payload]);
    if (command === REPLAY_COMMANDS.GET_STATE) return replayState;
    if (command === REPLAY_COMMANDS.PAUSE) return { ...replayState, status: 'paused' };
    if (command === REPLAY_COMMANDS.SET_CURSOR_TIME) return { ...replayState, cursorTime: payload.cursorTime, status: 'paused' };
    throw new Error(`Unexpected command: ${command}`);
  },
  hasCommand: () => false,
  replaceCursor: async ({ paneIds, replayState: replacedReplayState }) => ({
    chartRecords: paneIds.map((paneId) => ({ bars: [{ timestamp: 1 }], paneId })),
    replayState: replacedReplayState,
  }),
});
const unsubscribe = subscribeEvent(CHART_ENTRY_RESTART_EVENTS.RESTARTED, (payload) => events.push(payload));
const registry = createRuntimeRegistry();
registry.registerRuntime(runtime);
await registry.start({ emitEvent });

assert.equal(hasCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART), true);
const restarted = await dispatchCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART, {
  cutoffTime: '2026-06-01T09:33:00.000Z',
  paneIds: ['main', 'secondary'],
});
assert.equal(restarted.status, 'restarted');
assert.equal(restarted.restarted.cutoffTime, '2026-06-01T09:33:00.000Z');
assert.equal(restarted.restarted.replayState.cursorTime, '2026-06-01T09:32:00.000Z');
assert.deepEqual(restarted.restarted.paneIds, ['main', 'secondary']);
assert.equal(events.length, 1);
assert.equal(calls.some(([command]) => command === REPLAY_COMMANDS.PAUSE), true);

const beforeStart = await dispatchCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART, {
  cutoffTime: '2026-06-01T09:29:00.000Z',
  paneIds: ['main'],
});
assert.equal(beforeStart.status, 'error');
assert.match(beforeStart.error, /session start date/);

const future = await dispatchCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART, {
  cutoffTime: '2026-06-01T09:35:00.000Z',
  paneIds: ['main'],
});
assert.equal(future.status, 'error');
assert.match(future.error, /unrevealed future/);

await registry.stop();
unsubscribe();
clearCommandsForTest();
clearEventsForTest();

console.log('v6 chart entry restart runtime smoke passed');
