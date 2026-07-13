import assert from 'node:assert/strict';
import { executeNarrowReplayMaterializationRuntimeHandoffPlan } from '../src/replay/narrow-replay-materialization-runtime-handoff-executor.js';

const baseEvent = Object.freeze({
  paneId: 'main',
  replayCursorTimestamp: 300,
  sourceTimeframe: '1m',
});

const baseCommandResults = Object.freeze({
  paneContext: Object.freeze({
    displayTimeframe: '8h',
    id: 'main',
    instrument: 'NQ',
    targetHistoryWindow: Object.freeze({
      end: 300,
      start: 0,
    }),
  }),
  replayState: Object.freeze({
    cursorTimestamp: 300,
  }),
  sourceBars: Object.freeze([
    Object.freeze({ close: 100, time: 240 }),
    Object.freeze({ close: 101, time: 300 }),
  ]),
  targetWindowPlan: Object.freeze({
    displayTimeframe: '8h',
    end: 300,
    start: 0,
  }),
  targetWindowLoad: Object.freeze({
    bars: Object.freeze([
      Object.freeze({ close: 100, bucketEndTimestamp: 200, bucketStartTimestamp: 100, time: 100 }),
      Object.freeze({ close: 101, bucketEndTimestamp: 300, bucketStartTimestamp: 300, time: 300 }),
      Object.freeze({ close: 102, bucketEndTimestamp: 520, bucketStartTimestamp: 400, time: 400 }),
    ]),
  }),
});

const ready = executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults: baseCommandResults,
  event: baseEvent,
});
assert.equal(ready.status, 'ready');
assert.equal(ready.action, 'replace-display-bars');
assert.equal(ready.ownerBoundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(ready.runtimeBehaviorChanges, false);
assert.equal(ready.runtimeWiringReady, false);
assert.equal(ready.sourceReplayCursorAuthority, '1m');
assert.equal(ready.replaceIntent.commandSurface, 'chartData.replaceBars');
assert.equal(ready.replaceIntent.paneId, 'main');
assert.equal(ready.replaceIntent.displayTimeframe, '8h');
assert.equal(ready.replaceIntent.preserveSource, true);
assert.equal(ready.replaceIntent.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(ready.replaceIntent.revealPolicy, 'source-cursor-no-future-target-bars');
assert.deepEqual(ready.replaceIntent.bars.map((bar) => bar.time), [100, 300]);
assert.deepEqual(ready.revealStates.map((state) => state.visible), [true, true, false]);
assert.deepEqual(ready.commandIntents.map((intent) => intent.commandSurface), [
  'pane.getById',
  'replay.getState',
  'chartData.getSourceBars',
  'barData.planTargetWindow',
  'barData.loadTargetWindow',
  'chartData.replaceBars',
]);
assert.deepEqual(ready.commandIntents.map((intent) => intent.injectedResult), [
  'available',
  'available',
  'available',
  'available',
  'available',
  'ready',
]);
assert.deepEqual(ready.validation, { errors: [], valid: true });

const sourceDisplay = executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults: {
    ...baseCommandResults,
    paneContext: {
      ...baseCommandResults.paneContext,
      displayTimeframe: '1m',
    },
  },
  event: baseEvent,
});
assert.equal(sourceDisplay.status, 'fallback');
assert.equal(sourceDisplay.fallbackGateId, 'ignore-source-timeframe-display');
assert.equal(sourceDisplay.replaceIntent, null);

const missingPane = executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults: {
    ...baseCommandResults,
    paneContext: null,
  },
  event: baseEvent,
});
assert.equal(missingPane.status, 'fallback');
assert.equal(missingPane.fallbackGateId, 'missing-pane-context');

const missingReplayCursor = executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults: {
    ...baseCommandResults,
    replayState: {},
  },
  event: {
    ...baseEvent,
    replayCursorTimestamp: null,
  },
});
assert.equal(missingReplayCursor.status, 'fallback');
assert.equal(missingReplayCursor.fallbackGateId, 'missing-replay-cursor');

const missingSourceBars = executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults: {
    ...baseCommandResults,
    sourceBars: [],
  },
  event: baseEvent,
});
assert.equal(missingSourceBars.status, 'fallback');
assert.equal(missingSourceBars.fallbackGateId, 'missing-source-bars');

const missingTargetPlan = executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults: {
    ...baseCommandResults,
    targetWindowPlan: null,
  },
  event: baseEvent,
});
assert.equal(missingTargetPlan.status, 'fallback');
assert.equal(missingTargetPlan.fallbackGateId, 'target-window-plan-unavailable');

const missingTargetLoad = executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults: {
    ...baseCommandResults,
    targetWindowLoad: {
      bars: [],
    },
  },
  event: baseEvent,
});
assert.equal(missingTargetLoad.status, 'fallback');
assert.equal(missingTargetLoad.fallbackGateId, 'target-window-load-unavailable');

const allFutureTargetBars = executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults: {
    ...baseCommandResults,
    targetWindowLoad: {
      bars: [
        { bucketEndTimestamp: 520, bucketStartTimestamp: 400, close: 102, time: 400 },
      ],
    },
  },
  event: baseEvent,
});
assert.equal(allFutureTargetBars.status, 'fallback');
assert.equal(allFutureTargetBars.fallbackGateId, 'target-bars-all-future');
assert.equal(allFutureTargetBars.revealStates[0].visible, false);

console.log('v6 narrow replay materialization runtime handoff executor step358 smoke passed');
