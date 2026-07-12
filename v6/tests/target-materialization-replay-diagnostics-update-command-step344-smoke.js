import assert from 'node:assert/strict';
import {
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS,
} from '../src/contracts/app-contracts.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
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
    displayApplyStatus: 'projected',
    displayTimeframe: '8h',
    latestDisplayTimestamp: 1780332600,
    latestSourceTimestamp: 1780332660,
    paneId: 'main',
    projectionOwner: 'runtime.chart-data-projection',
    sourceCursorTime: '2026-06-01T16:51:00.000Z',
    targetHistoryStatus: 'fallback',
  },
}));
await registry.start({ emitEvent });

assert.equal(readyEvents.length, 1);

const updated = await dispatchCommand(
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT,
  {
    displayApplyStatus: 'applied',
    fallbackStatus: 'available',
    latestSourceTimestamp: 1780332720,
    projectionOwner: 'runtime.bar-data',
    targetHistoryReason: 'target-history-opt-in',
    targetHistoryStatus: 'applied',
  },
);
assert.equal(updated.status, 'ready');
assert.equal(updated.snapshot.displayApplyStatus, 'applied');
assert.equal(updated.snapshot.displayTimeframe, '8h');
assert.equal(updated.snapshot.fallbackStatus, 'available');
assert.equal(updated.snapshot.latestDisplayTimestamp, 1780332600);
assert.equal(updated.snapshot.latestSourceTimestamp, 1780332720);
assert.equal(updated.snapshot.projectionOwner, 'runtime.bar-data');
assert.equal(updated.snapshot.sourceCursorAuthority, true);
assert.equal(updated.snapshot.targetBarsDisplayInputOnly, true);
assert.equal(readyEvents.length, 2);
assert.equal(readyEvents[1].snapshot.targetHistoryStatus, 'applied');

updated.snapshot.paneId = 'mutated';
const afterMutation = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(afterMutation.snapshot.paneId, 'main');

const rejected = await dispatchCommand(
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT,
  {
    latestDisplayTimestamp: 1780333000,
    latestSourceTimestamp: 1780332000,
    sourceCursorAuthority: false,
    targetBarsDisplayInputOnly: false,
  },
);
assert.equal(rejected.status, 'rejected');
assert.deepEqual(
  rejected.errors.map((error) => error.field),
  ['sourceCursorAuthority', 'targetBarsDisplayInputOnly', 'latestSourceTimestamp'],
);
assert.equal(rejected.snapshot.latestSourceTimestamp, 1780332720);
assert.equal(rejected.rejectedSnapshot.sourceCursorAuthority, false);
assert.equal(readyEvents.length, 2);

const afterRejected = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(afterRejected.status, 'ready');
assert.equal(afterRejected.snapshot.latestSourceTimestamp, 1780332720);
assert.equal(afterRejected.snapshot.sourceCursorAuthority, true);
assert.equal(afterRejected.snapshot.targetBarsDisplayInputOnly, true);

await registry.stop();
unsubscribe();
clearCommandsForTest();
clearEventsForTest();

const emptyRegistry = createRuntimeRegistry();
emptyRegistry.registerRuntime(createTargetMaterializationReplayDiagnosticsRuntime());
await emptyRegistry.start({ emitEvent });
const fromEmpty = await dispatchCommand(
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT,
  {
    autoPlayStatus: 'playing',
    latestDisplayTimestamp: 100,
    latestSourceTimestamp: 100,
    paneId: 'secondary',
  },
);
assert.equal(fromEmpty.status, 'ready');
assert.equal(fromEmpty.snapshot.paneId, 'secondary');
assert.equal(fromEmpty.snapshot.autoPlayStatus, 'playing');
assert.equal(fromEmpty.snapshot.sourceCursorAuthority, true);
assert.equal(fromEmpty.snapshot.targetBarsDisplayInputOnly, true);
await emptyRegistry.stop();
clearCommandsForTest();
clearEventsForTest();

console.log('v6 target materialization replay diagnostics update command step344 smoke passed');
