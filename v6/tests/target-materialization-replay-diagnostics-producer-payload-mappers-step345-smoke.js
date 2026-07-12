import assert from 'node:assert/strict';
import {
  createTargetMaterializationReplayDiagnosticsSnapshot,
  validateTargetMaterializationReplayDiagnosticsSnapshot,
} from '../src/replay/target-materialization-replay-diagnostics-contract.js';
import {
  getTargetMaterializationReplayDiagnosticsProducerEventNames,
  mapAutoPlayStateToDiagnosticsUpdate,
  mapDisplayTimeframeAppliedToDiagnosticsUpdate,
  mapManualNextAdvancedToDiagnosticsUpdate,
  mapTargetMaterializationReplayDiagnosticsProducerPayload,
} from '../src/replay/target-materialization-replay-diagnostics-producer-payload-mappers.js';

function assertValidUpdate(update) {
  const snapshot = createTargetMaterializationReplayDiagnosticsSnapshot(update);
  assert.deepEqual(validateTargetMaterializationReplayDiagnosticsSnapshot(snapshot), {
    errors: [],
    valid: true,
  });
}

assert.deepEqual(getTargetMaterializationReplayDiagnosticsProducerEventNames(), [
  'displayTimeframe:applied',
  'chartEntryManualNext:advanced',
  'chartEntryAutoPlay:started',
  'chartEntryAutoPlay:ticked',
  'chartEntryAutoPlay:stopped',
]);

const displayApplied = mapDisplayTimeframeAppliedToDiagnosticsUpdate({
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
assert.deepEqual(displayApplied, {
  displayApplyStatus: 'applied',
  displayTimeframe: '8h',
  fallbackStatus: 'available',
  latestDisplayTimestamp: 1780329600,
  latestSourceTimestamp: 1780332660,
  paneId: 'main',
  projectionOwner: 'runtime.bar-data',
  sourceCursorAuthority: true,
  targetBarsDisplayInputOnly: true,
  targetHistoryReason: 'target-history-opt-in',
  targetHistoryStatus: 'applied',
});
assertValidUpdate(displayApplied);

const displayFallback = mapDisplayTimeframeAppliedToDiagnosticsUpdate({
  chartRecord: {
    bars: [{ timestamp: 1780329000 }],
    cursorTimestamp: 1780329060,
  },
  pane: {
    displayTimeframe: '1D',
    id: 'secondary',
  },
  projectionSource: {
    owner: 'runtime.chart-data-projection',
  },
  targetHistory: {
    reason: 'target-history-empty',
    status: 'fallback',
  },
});
assert.equal(displayFallback.fallbackStatus, 'target-history-empty');
assert.equal(displayFallback.targetHistoryStatus, 'fallback');
assert.equal(displayFallback.projectionOwner, 'runtime.chart-data-projection');
assertValidUpdate(displayFallback);

const manualNext = mapManualNextAdvancedToDiagnosticsUpdate({
  chartRecord: {
    paneId: 'main',
  },
  replayState: {
    cursorTime: '2026-06-01T18:01:00.000Z',
  },
  status: 'advanced',
});
assert.deepEqual(manualNext, {
  latestSourceTimestamp: 1780336860,
  manualNextStatus: 'advanced',
  paneId: 'main',
  sourceCursorAuthority: true,
  sourceCursorTime: '2026-06-01T18:01:00.000Z',
  targetBarsDisplayInputOnly: true,
});
assertValidUpdate(manualNext);

const autoStarted = mapAutoPlayStateToDiagnosticsUpdate({
  paneId: 'main',
  playing: true,
  status: 'playing',
}, { eventName: 'chartEntryAutoPlay:started' });
assert.deepEqual(autoStarted, {
  autoPlayStatus: 'started',
  paneId: 'main',
  sourceCursorAuthority: true,
  targetBarsDisplayInputOnly: true,
});
assertValidUpdate(autoStarted);

const autoTicked = mapAutoPlayStateToDiagnosticsUpdate({
  lastTick: {
    replayState: {
      cursorTime: '2026-06-01T18:02:00.000Z',
    },
  },
  paneIds: ['secondary'],
  status: 'playing',
}, { eventName: 'chartEntryAutoPlay:ticked' });
assert.equal(autoTicked.autoPlayStatus, 'playing');
assert.equal(autoTicked.latestSourceTimestamp, 1780336920);
assert.equal(autoTicked.paneId, 'secondary');
assertValidUpdate(autoTicked);

const autoStopped = mapTargetMaterializationReplayDiagnosticsProducerPayload(
  'chartEntryAutoPlay:stopped',
  {
    error: 'Chart entry manual next failed during auto play.',
    paneId: 'main',
    status: 'error',
  },
);
assert.equal(autoStopped.autoPlayStatus, 'error');
assert.equal(autoStopped.fallbackStatus, 'Chart entry manual next failed during auto play.');
assertValidUpdate(autoStopped);

assert.deepEqual(
  mapTargetMaterializationReplayDiagnosticsProducerPayload('displayTimeframe:applied', displayFallback),
  mapDisplayTimeframeAppliedToDiagnosticsUpdate(displayFallback),
);
assert.equal(mapTargetMaterializationReplayDiagnosticsProducerPayload('unknown:event', {}), null);
assert.equal(mapDisplayTimeframeAppliedToDiagnosticsUpdate(null), null);
assert.equal(mapManualNextAdvancedToDiagnosticsUpdate('bad'), null);
assert.equal(mapAutoPlayStateToDiagnosticsUpdate(null), null);

console.log('v6 target materialization replay diagnostics producer payload mappers step345 smoke passed');
