import assert from 'node:assert/strict';
import {
  createDefaultReplayCoordinationMaterializationIntent,
  createReplayCoordinationMaterializationOwnerContract,
  getReplayCoordinationMaterializationAcceptanceGates,
  getReplayCoordinationMaterializationOwner,
  getReplayCoordinationMaterializationParticipants,
  resolveReplayCoordinationTargetBarRevealState,
  validateReplayCoordinationMaterializationIntent,
} from '../src/replay/replay-coordination-materialization-owner-contract.js';

assert.equal(getReplayCoordinationMaterializationOwner(), 'replay-coordination-materialization-contract');
assert.deepEqual(getReplayCoordinationMaterializationAcceptanceGates(), [
  'source-1m-replay-cursor-authority',
  'target-bars-display-materialization-input-only',
  'no-replay-cursor-mutation',
  'no-viewport-intent-mutation',
  'chart-data-no-future-filtering',
  'bar-data-target-cache-owner',
  'chart-history-request-coordination-only',
]);

const participants = getReplayCoordinationMaterializationParticipants();
assert.deepEqual(participants.map((participant) => participant.id), [
  'replay-runtime',
  'bar-data-runtime',
  'chart-data-runtime',
  'chart-history',
  'display-timeframe-runtime',
  'chart-viewport-runtime',
]);
assert.equal(participants.find((participant) => participant.id === 'replay-runtime').writes.includes('sourceCursorTime'), true);
assert.equal(participants.find((participant) => participant.id === 'bar-data-runtime').writes.includes('targetBarsCache'), true);
assert.equal(participants.find((participant) => participant.id === 'chart-data-runtime').writes.includes('noFutureFilteredBars'), true);
assert.equal(participants.find((participant) => participant.id === 'chart-viewport-runtime').forbidden.includes('mutateReplayCursor'), true);

const defaultIntent = createDefaultReplayCoordinationMaterializationIntent();
assert.deepEqual(defaultIntent, {
  chartDataFiltersNoFuture: true,
  chartHistoryCoordinatesRequests: true,
  displayMaterializationInputOnly: true,
  mutatesReplayCursor: false,
  mutatesViewportIntent: false,
  replaySourceTimeframe: 1,
  targetBarCompletenessUsesSourceCursor: true,
  targetHistoryRequestSizingUnchanged: true,
  writesChartSeries: false,
});
assert.equal(Object.isFrozen(defaultIntent), true);
assert.deepEqual(validateReplayCoordinationMaterializationIntent(defaultIntent), { errors: [], valid: true });

const invalid = validateReplayCoordinationMaterializationIntent({
  chartDataFiltersNoFuture: false,
  chartHistoryCoordinatesRequests: false,
  displayMaterializationInputOnly: false,
  mutatesReplayCursor: true,
  mutatesViewportIntent: true,
  replaySourceTimeframe: 5,
  targetBarCompletenessUsesSourceCursor: false,
  targetHistoryRequestSizingUnchanged: false,
  writesChartSeries: true,
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  [
    'replaySourceTimeframe',
    'mutatesReplayCursor',
    'mutatesViewportIntent',
    'writesChartSeries',
    'displayMaterializationInputOnly',
    'chartDataFiltersNoFuture',
    'targetBarCompletenessUsesSourceCursor',
    'chartHistoryCoordinatesRequests',
    'targetHistoryRequestSizingUnchanged',
  ],
);

const hidden = resolveReplayCoordinationTargetBarRevealState({
  replayCursorTimestamp: 99,
  targetBar: { bucketEndTimestamp: 159, bucketStartTimestamp: 100 },
});
assert.deepEqual(hidden, {
  bucketEndTimestamp: 159,
  bucketStartTimestamp: 100,
  complete: false,
  cursorCapped: true,
  reason: 'target-bar-start-after-source-cursor',
  visible: false,
});

const inProgress = resolveReplayCoordinationTargetBarRevealState({
  replayCursorTimestamp: 120,
  targetBar: { bucketEndTimestamp: 159, bucketStartTimestamp: 100 },
});
assert.deepEqual(inProgress, {
  bucketEndTimestamp: 159,
  bucketStartTimestamp: 100,
  complete: false,
  cursorCapped: true,
  reason: 'source-cursor-inside-target-bucket',
  visible: false,
});

const complete = resolveReplayCoordinationTargetBarRevealState({
  replayCursorTimestamp: 159,
  targetBar: { bucketEndTimestamp: 159, bucketStartTimestamp: 100 },
});
assert.deepEqual(complete, {
  bucketEndTimestamp: 159,
  bucketStartTimestamp: 100,
  complete: true,
  cursorCapped: false,
  reason: 'target-bar-complete-before-or-at-source-cursor',
  visible: true,
});

const contract = createReplayCoordinationMaterializationOwnerContract();
assert.equal(contract.owner, 'replay-coordination-materialization-contract');
assert.equal(contract.replaySourceTimeframe, 1);
assert.equal(contract.targetBarsMayMaterializeDisplay, true);
assert.equal(contract.readOnlyContractReady, true);
assert.equal(contract.runtimeWiringReady, false);
assert.equal(contract.writeReady, false);
assert.equal(Object.isFrozen(contract), true);

console.log('v6 replay coordination materialization owner contract step329 smoke passed');
