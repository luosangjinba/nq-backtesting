import assert from 'node:assert/strict';
import {
  createTargetMaterializationReplayDiagnosticsReadoutViewModel,
  getTargetMaterializationReplayDiagnosticsReadoutViewModelId,
  validateTargetMaterializationReplayDiagnosticsReadoutViewModel,
} from '../src/shell/target-materialization-replay-diagnostics-readout-view-model.js';

assert.equal(
  getTargetMaterializationReplayDiagnosticsReadoutViewModelId(),
  'target-materialization-replay-diagnostics-readout-view-model',
);

const empty = createTargetMaterializationReplayDiagnosticsReadoutViewModel({ status: 'idle', snapshot: null });
assert.equal(empty.mode, 'hidden');
assert.equal(empty.visible, false);
assert.equal(empty.reason, 'snapshot-not-ready');
assert.deepEqual(empty.rows, []);
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutViewModel(empty), {
  errors: [],
  valid: true,
});

const normal = createTargetMaterializationReplayDiagnosticsReadoutViewModel({
  snapshot: {
    displayTimeframe: '1m',
    fallbackStatus: 'target-history-disabled',
    paneId: 'main',
    projectionOwner: 'source-projection',
    targetHistoryStatus: 'disabled',
  },
  status: 'ready',
});
assert.equal(normal.mode, 'hidden');
assert.equal(normal.visible, false);
assert.equal(normal.reason, 'normal-replay');
assert.deepEqual(normal.rows, []);
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutViewModel(normal), {
  errors: [],
  valid: true,
});

const active = createTargetMaterializationReplayDiagnosticsReadoutViewModel({
  snapshot: {
    autoPlayStatus: 'stopped',
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
  },
  status: 'ready',
});
assert.equal(active.mode, 'collapsed');
assert.equal(active.visible, true);
assert.equal(active.reason, 'target-history-active');
assert.deepEqual(active.rows.map((row) => row.field), [
  'displayTimeframe',
  'targetHistoryStatus',
  'projectionOwner',
  'manualNextStatus',
  'autoPlayStatus',
  'fallbackStatus',
]);
assert.deepEqual(active.rows.map((row) => row.value), [
  '8h',
  'applied',
  'runtime.bar-data',
  'advanced',
  'stopped',
  'available',
]);
assert.match(active.title, /Replay cursor authority: source 1m/);
assert.match(active.title, /Target bars: display input only/);
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutViewModel(active), {
  errors: [],
  valid: true,
});

const fallback = createTargetMaterializationReplayDiagnosticsReadoutViewModel({
  snapshot: {
    autoPlayStatus: 'ticked',
    displayTimeframe: '1D',
    fallbackStatus: 'target-history-empty',
    manualNextStatus: 'advanced',
    paneId: 'main',
    projectionOwner: 'source-projection',
    targetHistoryStatus: 'fallback',
  },
  status: 'ready',
});
assert.equal(fallback.mode, 'collapsed');
assert.equal(fallback.visible, true);
assert.equal(fallback.reason, 'fallback');
assert.equal(fallback.rows.find((row) => row.field === 'fallbackStatus').value, 'target-history-empty');
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutViewModel(fallback), {
  errors: [],
  valid: true,
});

for (const internalOnlyField of [
  'paneId',
  'sourceCursorTime',
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
  'latestSourceTimestamp',
  'latestDisplayTimestamp',
  'targetHistoryReason',
  'displayApplyStatus',
]) {
  assert.equal(
    active.rows.some((row) => row.field === internalOnlyField),
    false,
    `internal-only field must remain hidden: ${internalOnlyField}`,
  );
}

const invalid = validateTargetMaterializationReplayDiagnosticsReadoutViewModel({
  ...active,
  rows: [
    ...active.rows,
    { field: 'sourceCursorAuthority', label: 'Authority', value: 'true' },
  ],
});
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.some((error) => error.message.includes('sourceCursorAuthority')));

console.log('v6 target materialization replay diagnostics readout view model step349 smoke passed');
