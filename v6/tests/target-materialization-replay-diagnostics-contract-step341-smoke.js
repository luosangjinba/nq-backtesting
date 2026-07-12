import assert from 'node:assert/strict';
import {
  createTargetMaterializationReplayDiagnosticsOwnerContract,
  createTargetMaterializationReplayDiagnosticsSnapshot,
  getTargetMaterializationReplayDiagnosticsAcceptanceGates,
  getTargetMaterializationReplayDiagnosticsOwner,
  getTargetMaterializationReplayDiagnosticsParticipants,
  getTargetMaterializationReplayDiagnosticsReadFields,
  validateTargetMaterializationReplayDiagnosticsSnapshot,
} from '../src/replay/target-materialization-replay-diagnostics-contract.js';

assert.equal(getTargetMaterializationReplayDiagnosticsOwner(), 'target-materialization-replay-diagnostics-contract');
assert.deepEqual(getTargetMaterializationReplayDiagnosticsReadFields(), [
  'paneId',
  'displayTimeframe',
  'displayApplyStatus',
  'projectionOwner',
  'targetHistoryStatus',
  'targetHistoryReason',
  'manualNextStatus',
  'autoPlayStatus',
  'fallbackStatus',
  'sourceCursorTime',
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
  'latestSourceTimestamp',
  'latestDisplayTimestamp',
]);
assert.deepEqual(getTargetMaterializationReplayDiagnosticsAcceptanceGates(), [
  'read-only-diagnostics-contract',
  'source-1m-replay-cursor-authority',
  'target-bars-display-input-only',
  'shell-reads-diagnostics-no-target-api',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-replay-cursor-mutation',
  'no-runtime-handoff-in-contract-step',
]);

const participants = getTargetMaterializationReplayDiagnosticsParticipants();
assert.deepEqual(participants.map((participant) => participant.id), [
  'display-timeframe-runtime',
  'chart-entry-manual-next-runtime',
  'chart-entry-auto-play-runtime',
  'shell-diagnostics-readout',
]);
assert.equal(participants.find((participant) => participant.id === 'shell-diagnostics-readout').reads.includes('diagnosticSnapshot'), true);
assert.equal(participants.every((participant) => participant.forbidden.includes('mutateReplayCursor')), true);
assert.equal(participants.every((participant) => participant.forbidden.includes('writeChartSeries')), true);

const snapshot = createTargetMaterializationReplayDiagnosticsSnapshot({
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
});
assert.deepEqual(snapshot, {
  autoPlayStatus: 'paused',
  displayApplyStatus: 'applied',
  displayTimeframe: '8h',
  fallbackStatus: 'available',
  latestDisplayTimestamp: 1780332600,
  latestSourceTimestamp: 1780332660,
  manualNextStatus: 'advanced',
  paneId: 'main',
  projectionOwner: 'runtime.bar-data',
  sourceCursorAuthority: true,
  sourceCursorTime: '2026-06-01T16:51:00.000Z',
  targetBarsDisplayInputOnly: true,
  targetHistoryReason: 'target-history-opt-in',
  targetHistoryStatus: 'applied',
});
assert.equal(Object.isFrozen(snapshot), true);
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsSnapshot(snapshot), { errors: [], valid: true });

const invalid = validateTargetMaterializationReplayDiagnosticsSnapshot({
  latestDisplayTimestamp: 200,
  latestSourceTimestamp: 100,
  paneId: '',
  sourceCursorAuthority: false,
  targetBarsDisplayInputOnly: false,
});
assert.equal(invalid.valid, false);
assert.deepEqual(invalid.errors.map((error) => error.field), [
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
  'latestSourceTimestamp',
]);

const contract = createTargetMaterializationReplayDiagnosticsOwnerContract();
assert.equal(contract.owner, 'target-materialization-replay-diagnostics-contract');
assert.equal(contract.readOnlyContractReady, true);
assert.equal(contract.runtimeCommandReady, false);
assert.equal(contract.runtimeWiringReady, false);
assert.equal(contract.writeReady, false);
assert.equal(contract.shellConsumption.mode, 'command-event-diagnostic-snapshot');
assert.equal(contract.shellConsumption.forbidden.includes('callTargetBarsApi'), true);
assert.equal(Object.isFrozen(contract), true);

console.log('v6 target materialization replay diagnostics contract step341 smoke passed');
