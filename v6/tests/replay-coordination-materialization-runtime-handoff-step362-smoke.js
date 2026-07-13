import assert from 'node:assert/strict';
import {
  buildReplayCoordinationMaterializationRuntimeHandoffResult,
  collectReplayCoordinationMaterializationRuntimeHandoffCommandResults,
  createReplayCoordinationMaterializationRuntimeHandoff,
} from '../src/replay/replay-coordination-materialization-runtime-handoff.js';

const dispatchCalls = [];
const fakeCommandResults = new Map([
  ['pane.getById', { displayTimeframe: '8h', id: 'main', instrument: 'NQ', targetHistoryWindow: { end: 300, start: 0 } }],
  ['replay.getState', { cursorTimestamp: 300 }],
  ['chartData.getSourceBars', { bars: [{ close: 100, time: 240 }, { close: 101, time: 300 }] }],
  ['barData.planTargetWindow', { displayTimeframe: '8h', end: 300, start: 0 }],
  ['barData.loadTargetWindow', { bars: [{ bucketEndTimestamp: 300, bucketStartTimestamp: 0, close: 101, time: 0 }] }],
  ['chartData.replaceBars', { status: 'replaced' }],
]);

async function fakeDispatch(command, payload) {
  dispatchCalls.push({ command, payload });
  return fakeCommandResults.get(command);
}

const commandResults = await collectReplayCoordinationMaterializationRuntimeHandoffCommandResults({
  dispatchCommand: fakeDispatch,
  event: {
    paneId: 'main',
    replayCursorTimestamp: 300,
  },
});
assert.equal(commandResults.paneContext.id, 'main');
assert.equal(commandResults.replayState.cursorTimestamp, 300);
assert.equal(commandResults.sourceBars.length, 2);
assert.equal(commandResults.targetWindowPlan.displayTimeframe, '8h');
assert.equal(commandResults.targetWindowLoad.bars.length, 1);
assert.deepEqual(dispatchCalls.map((call) => call.command), [
  'pane.getById',
  'replay.getState',
  'chartData.getSourceBars',
  'barData.planTargetWindow',
  'barData.loadTargetWindow',
]);
assert.equal(dispatchCalls[0].payload, 'main');

const isoCursorResult = await buildReplayCoordinationMaterializationRuntimeHandoffResult({
  commandResults: {
    ...commandResults,
    replayState: { cursorTime: '1970-01-01T00:05:00.000Z' },
  },
  dispatchCommand: fakeDispatch,
  event: { paneId: 'main' },
});
assert.equal(isoCursorResult.status, 'ready');
assert.equal(isoCursorResult.replayCursorTimestamp, 300);

dispatchCalls.length = 0;
const readyResult = await buildReplayCoordinationMaterializationRuntimeHandoffResult({
  commandResults,
  dispatchCommand: fakeDispatch,
  event: { paneId: 'main', replayCursorTimestamp: 300 },
  executor: () => ({
    replaceIntent: {
      bars: [{ close: 101, time: 0 }],
      commandSurface: 'chartData.replaceBars',
      paneId: 'main',
      preserveSource: true,
    },
    status: 'ready',
  }),
});
assert.equal(readyResult.status, 'ready');
assert.deepEqual(dispatchCalls.map((call) => call.command), ['chartData.replaceBars']);
assert.equal(dispatchCalls[0].payload.preserveSource, true);

dispatchCalls.length = 0;
const fallbackResult = await buildReplayCoordinationMaterializationRuntimeHandoffResult({
  commandResults,
  dispatchCommand: fakeDispatch,
  event: { paneId: 'main', replayCursorTimestamp: 300 },
  executor: () => ({
    fallbackGateId: 'target-window-load-unavailable',
    replaceIntent: null,
    status: 'fallback',
  }),
});
assert.equal(fallbackResult.status, 'fallback');
assert.deepEqual(dispatchCalls, []);

const staleResult = await buildReplayCoordinationMaterializationRuntimeHandoffResult({
  commandResults,
  dispatchCommand: fakeDispatch,
  event: { paneId: 'main', replayCursorTimestamp: 300 },
  shouldCommit: () => false,
});
assert.equal(staleResult.status, 'stale');
assert.equal(staleResult.replaceIntent, null);
assert.deepEqual(dispatchCalls, []);

let subscribedEvent = null;
let subscribedListener = null;
let cleanupCount = 0;
const runtime = createReplayCoordinationMaterializationRuntimeHandoff({
  dispatchCommand: fakeDispatch,
  executor: () => ({
    fallbackGateId: 'ignore-source-timeframe-display',
    replaceIntent: null,
    status: 'fallback',
  }),
  subscribeEvent(eventName, listener) {
    subscribedEvent = eventName;
    subscribedListener = listener;
    return () => {
      cleanupCount += 1;
    };
  },
});
assert.equal(runtime.id, 'runtime.replay-coordination-materialization-handoff');
assert.deepEqual(runtime.getState(), {
  id: 'runtime.replay-coordination-materialization-handoff',
  lastResult: null,
  started: false,
});
runtime.start();
assert.equal(subscribedEvent, 'chartEntryManualNext:advanced');
assert.equal(runtime.getState().started, true);
await subscribedListener({ paneId: 'main', replayCursorTimestamp: 300 });
assert.equal(runtime.getState().lastResult.status, 'fallback');
runtime.stop();
assert.equal(cleanupCount, 1);
assert.deepEqual(runtime.getState(), {
  id: 'runtime.replay-coordination-materialization-handoff',
  lastResult: null,
  started: false,
});

console.log('v6 replay coordination materialization runtime handoff step362 smoke passed');
