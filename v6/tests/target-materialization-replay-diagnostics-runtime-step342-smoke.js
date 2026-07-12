import assert from 'node:assert/strict';
import {
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS,
} from '../src/contracts/app-contracts.js';
import { dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { clearCommandsForTest } from '../src/runtime/commands.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createTargetMaterializationReplayDiagnosticsRuntime } from '../src/replay/target-materialization-replay-diagnostics-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const readyEvents = [];
const unsubscribe = subscribeEvent(
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS.SNAPSHOT_READY,
  (payload) => readyEvents.push(payload),
);

const registry = createRuntimeRegistry();
registry.registerRuntime(createTargetMaterializationReplayDiagnosticsRuntime({
  initialSnapshot: {
    autoPlayStatus: 'paused',
    displayApplyStatus: 'applied',
    displayTimeframe: '8h',
    fallbackStatus: 'available',
    latestDisplayTimestamp: 1780332600,
    latestSourceTimestamp: 1780332660,
    manualNextStatus: 'advanced',
    paneId: 'main',
    projectionOwner: 'runtime.bar-data',
    sourceCursorTime: '2026-06-01T16:51:00.000Z',
    targetHistoryReason: 'target-history-opt-in',
    targetHistoryStatus: 'applied',
  },
}));
await registry.start({ emitEvent });

const state = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(state.status, 'ready');
assert.equal(state.snapshot.paneId, 'main');
assert.equal(state.snapshot.displayTimeframe, '8h');
assert.equal(state.snapshot.projectionOwner, 'runtime.bar-data');
assert.equal(state.snapshot.sourceCursorAuthority, true);
assert.equal(state.snapshot.targetBarsDisplayInputOnly, true);
assert.equal(state.snapshot.latestSourceTimestamp, 1780332660);
assert.equal(state.snapshot.latestDisplayTimestamp, 1780332600);

state.snapshot.paneId = 'mutated';
const afterMutation = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(afterMutation.snapshot.paneId, 'main');

assert.equal(readyEvents.length, 1);
assert.equal(readyEvents[0].status, 'ready');
assert.equal(readyEvents[0].snapshot.targetHistoryStatus, 'applied');

await registry.stop();
unsubscribe();
clearCommandsForTest();
clearEventsForTest();

const emptyRegistry = createRuntimeRegistry();
emptyRegistry.registerRuntime(createTargetMaterializationReplayDiagnosticsRuntime());
await emptyRegistry.start();
const empty = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.deepEqual(empty, {
  snapshot: null,
  status: 'idle',
});
await emptyRegistry.stop();
clearCommandsForTest();

assert.throws(
  () => createTargetMaterializationReplayDiagnosticsRuntime({
    initialSnapshot: {
      latestDisplayTimestamp: 200,
      latestSourceTimestamp: 100,
      sourceCursorAuthority: false,
      targetBarsDisplayInputOnly: false,
    },
  }),
  /initial snapshot invalid/,
);

console.log('v6 target materialization replay diagnostics runtime step342 smoke passed');
