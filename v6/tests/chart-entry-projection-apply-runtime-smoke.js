import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_PROJECTION_APPLY_COMMANDS,
  CHART_ENTRY_PROJECTION_APPLY_EVENTS,
  CHART_ENTRY_PROJECTION_PREPARATION_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createChartEntryProjectionApplyRuntime } from '../src/chart-entry/chart-entry-projection-apply-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const bars = [
  { close: 100, high: 101, low: 99, open: 100, timestamp: 1780306200 },
  { close: 101, high: 102, low: 100, open: 100, timestamp: 1780306260 },
];
const prepared = {
  chartReplacePayload: {
    bars,
    cursorTimestamp: 1780306260,
    paneId: 'main',
  },
  sessionId: 'session-apply',
  viewportIntentPayload: {
    cursorTimestamp: 1780306260,
    latestOffsetBars: 12,
    paneId: 'main',
  },
};
const calls = [];
const forbiddenCalls = [];
const appliedEvents = [];
const unsubscribeApplied = subscribeEvent(CHART_ENTRY_PROJECTION_APPLY_EVENTS.APPLIED, (payload) => {
  appliedEvents.push(payload);
});
const registry = createRuntimeRegistry();
registry.registerRuntime(createChartEntryProjectionApplyRuntime());
await registry.start({ emitEvent, subscribeEvent });
registerCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, (payload) => {
  calls.push({ command: CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, payload });
  return {
    chartBarsRevision: 0,
    cursorTimestamp: payload.cursorTimestamp,
    latestLogicalIndex: 1,
    paneId: payload.paneId,
    projection: {
      from: -67,
      latestLogicalIndex: 1,
      latestOffsetBars: payload.latestOffsetBars,
      origin: 'default',
      spanBars: 80,
      to: 13,
    },
  };
});
registerCommand(CHART_DATA_COMMANDS.REPLACE_BARS, (payload) => {
  calls.push({ command: CHART_DATA_COMMANDS.REPLACE_BARS, payload });
  return {
    bars: payload.bars.map((bar) => ({ ...bar })),
    cursorTimestamp: payload.cursorTimestamp,
    paneId: payload.paneId,
    revision: 1,
  };
});
[
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  DEFAULT_WALL_COMMANDS.LOAD,
  REPLAY_COMMANDS.NEXT,
].forEach((command) => {
  registerCommand(command, (payload) => {
    forbiddenCalls.push({ command, payload });
  });
});

assert.equal(hasCommand(CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE), true);
assert.equal(listenerCount(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED), 1);
assert.equal(listenerCount(CHART_ENTRY_PROJECTION_APPLY_EVENTS.APPLIED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE), {
  applied: null,
  error: null,
  status: 'idle',
});

emitEvent(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED, prepared);
await new Promise((resolve) => setTimeout(resolve, 0));

const state = await dispatchCommand(CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
assert.equal(state.status, 'applied');
assert.equal(state.error, null);
assert.equal(state.applied.sessionId, 'session-apply');
assert.equal(state.applied.chartRecord.revision, 1);
assert.equal(state.applied.chartRecord.bars.length, 2);
assert.equal(state.applied.viewportRecord.paneId, 'main');
assert.deepEqual(calls.map((call) => call.command), [
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  CHART_DATA_COMMANDS.REPLACE_BARS,
]);
assert.deepEqual(calls[0].payload, prepared.viewportIntentPayload);
assert.deepEqual(calls[1].payload, prepared.chartReplacePayload);
assert.equal(appliedEvents.length, 1);
assert.equal(appliedEvents[0].chartRecord.bars.length, 2);
assert.equal(forbiddenCalls.length, 0);
assert.notEqual(state.applied.chartRecord.bars[0], prepared.chartReplacePayload.bars[0]);

await registry.stop();
unsubscribeApplied();
assert.equal(hasCommand(CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE), false);
assert.equal(listenerCount(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED), 0);
assert.equal(listenerCount(CHART_ENTRY_PROJECTION_APPLY_EVENTS.APPLIED), 0);

clearCommandsForTest();
clearEventsForTest();

const failingRegistry = createRuntimeRegistry();
failingRegistry.registerRuntime(createChartEntryProjectionApplyRuntime());
await failingRegistry.start({ emitEvent, subscribeEvent });
registerCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, () => {
  throw new Error('viewport unavailable');
});
emitEvent(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED, prepared);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(await dispatchCommand(CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE), {
  applied: null,
  error: 'viewport unavailable',
  status: 'error',
});
await failingRegistry.stop();

console.log('v6 chart entry projection apply runtime smoke passed');
