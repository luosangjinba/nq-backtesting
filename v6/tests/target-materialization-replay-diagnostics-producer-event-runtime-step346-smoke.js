import assert from 'node:assert/strict';
import {
  CHART_ENTRY_AUTO_PLAY_EVENTS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  DISPLAY_TIMEFRAME_EVENTS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS,
} from '../src/contracts/app-contracts.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, listenerCount, subscribeEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createTargetMaterializationReplayDiagnosticsRuntime } from '../src/replay/target-materialization-replay-diagnostics-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const readyEvents = [];
const unsubscribeReady = subscribeEvent(
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS.SNAPSHOT_READY,
  (payload) => readyEvents.push(payload),
);

const registry = createRuntimeRegistry();
registry.registerRuntime(createTargetMaterializationReplayDiagnosticsRuntime());
await registry.start({ emitEvent });

assert.equal(listenerCount(DISPLAY_TIMEFRAME_EVENTS.APPLIED), 1);
assert.equal(listenerCount(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED), 1);
assert.equal(listenerCount(CHART_ENTRY_AUTO_PLAY_EVENTS.STARTED), 1);
assert.equal(listenerCount(CHART_ENTRY_AUTO_PLAY_EVENTS.TICKED), 1);
assert.equal(listenerCount(CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED), 1);
assert.equal(readyEvents.length, 1);

emitEvent(DISPLAY_TIMEFRAME_EVENTS.APPLIED, {
  chartRecord: {
    bars: [
      { timestamp: 1780300800 },
      { timestamp: 1780329600 },
    ],
    cursorTimestamp: 1780332660,
    paneId: 'main',
  },
  pane: {
    displayTimeframe: '8h',
    id: 'main',
  },
  projectionSource: {
    owner: 'runtime.bar-data',
  },
  targetHistory: {
    reason: 'target-history-opt-in',
    status: 'applied',
  },
});

let snapshot = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(snapshot.status, 'ready');
assert.equal(snapshot.snapshot.displayApplyStatus, 'applied');
assert.equal(snapshot.snapshot.displayTimeframe, '8h');
assert.equal(snapshot.snapshot.latestDisplayTimestamp, 1780329600);
assert.equal(snapshot.snapshot.latestSourceTimestamp, 1780332660);
assert.equal(snapshot.snapshot.projectionOwner, 'runtime.bar-data');
assert.equal(snapshot.snapshot.targetHistoryStatus, 'applied');
assert.equal(readyEvents.length, 2);

emitEvent(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED, {
  chartRecord: {
    paneId: 'main',
  },
  replayState: {
    cursorTime: '2026-06-01T18:01:00.000Z',
  },
  status: 'advanced',
});

snapshot = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(snapshot.snapshot.manualNextStatus, 'advanced');
assert.equal(snapshot.snapshot.sourceCursorTime, '2026-06-01T18:01:00.000Z');
assert.equal(snapshot.snapshot.latestSourceTimestamp, 1780336860);
assert.equal(snapshot.snapshot.sourceCursorAuthority, true);
assert.equal(snapshot.snapshot.targetBarsDisplayInputOnly, true);
assert.equal(readyEvents.length, 3);

emitEvent(CHART_ENTRY_AUTO_PLAY_EVENTS.TICKED, {
  lastTick: {
    replayState: {
      cursorTime: '2026-06-01T18:02:00.000Z',
    },
  },
  paneId: 'main',
  status: 'playing',
});

snapshot = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(snapshot.snapshot.autoPlayStatus, 'playing');
assert.equal(snapshot.snapshot.sourceCursorTime, '2026-06-01T18:02:00.000Z');
assert.equal(snapshot.snapshot.latestSourceTimestamp, 1780336920);
assert.equal(readyEvents.length, 4);

emitEvent(CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED, {
  error: 'Chart entry manual next failed during auto play.',
  paneId: 'main',
  status: 'error',
});
snapshot = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(snapshot.snapshot.autoPlayStatus, 'error');
assert.equal(snapshot.snapshot.fallbackStatus, 'Chart entry manual next failed during auto play.');
assert.equal(readyEvents.length, 5);

emitEvent(DISPLAY_TIMEFRAME_EVENTS.APPLIED, null);
snapshot = await dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
assert.equal(snapshot.snapshot.autoPlayStatus, 'error');
assert.equal(readyEvents.length, 5);

await registry.stop();
assert.equal(listenerCount(DISPLAY_TIMEFRAME_EVENTS.APPLIED), 0);
assert.equal(listenerCount(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED), 0);
assert.equal(listenerCount(CHART_ENTRY_AUTO_PLAY_EVENTS.STARTED), 0);
assert.equal(listenerCount(CHART_ENTRY_AUTO_PLAY_EVENTS.TICKED), 0);
assert.equal(listenerCount(CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED), 0);

unsubscribeReady();
clearCommandsForTest();
clearEventsForTest();

console.log('v6 target materialization replay diagnostics producer event runtime step346 smoke passed');
