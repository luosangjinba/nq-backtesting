import {
  createTargetMaterializationReplayDiagnosticsSnapshot,
} from '../replay/target-materialization-replay-diagnostics-contract.js';
import {
  createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan,
} from '../replay/target-materialization-replay-diagnostics-readout-owner-plan.js';

const VIEW_MODEL_ID = 'target-materialization-replay-diagnostics-readout-view-model';
const HIDDEN_MODE = 'hidden';
const COLLAPSED_MODE = 'collapsed';

const FIELD_LABELS = Object.freeze({
  autoPlayStatus: 'Auto',
  displayTimeframe: 'TF',
  fallbackStatus: 'Fallback',
  manualNextStatus: 'Next',
  projectionOwner: 'Projection',
  targetHistoryStatus: 'Target',
});

function normalizeStatus(value) {
  return String(value || '').trim() || null;
}

function normalizeSnapshotEnvelope(input = {}) {
  if (input?.snapshot !== undefined || input?.status !== undefined) {
    return {
      snapshot: input.snapshot || null,
      status: normalizeStatus(input.status) || (input.snapshot ? 'ready' : 'idle'),
    };
  }
  return {
    snapshot: input || null,
    status: input ? 'ready' : 'idle',
  };
}

function formatFieldValue(field, snapshot) {
  const value = normalizeStatus(snapshot?.[field]);
  if (!value) return '--';
  if (field === 'displayTimeframe' && /^\d+$/.test(value)) return `${value}m`;
  return value;
}

function createRow(field, snapshot) {
  return Object.freeze({
    field,
    label: FIELD_LABELS[field] || field,
    value: formatFieldValue(field, snapshot),
  });
}

function isTargetHistoryActive(snapshot) {
  return normalizeStatus(snapshot?.targetHistoryStatus) === 'applied';
}

function isFallbackOccurred(snapshot) {
  const targetHistoryStatus = normalizeStatus(snapshot?.targetHistoryStatus);
  const fallbackStatus = normalizeStatus(snapshot?.fallbackStatus);
  if (targetHistoryStatus === 'fallback') return true;
  if (!fallbackStatus) return false;
  return fallbackStatus !== 'available' && fallbackStatus !== 'target-history-disabled';
}

function createHiddenViewModel({
  paneId = 'main',
  reason,
  snapshotReady = false,
} = {}) {
  return Object.freeze({
    collapsed: true,
    id: VIEW_MODEL_ID,
    mode: HIDDEN_MODE,
    paneId,
    reason,
    rows: Object.freeze([]),
    snapshotReady,
    title: 'Target materialization replay diagnostics hidden.',
    visible: false,
  });
}

export function getTargetMaterializationReplayDiagnosticsReadoutViewModelId() {
  return VIEW_MODEL_ID;
}

export function createTargetMaterializationReplayDiagnosticsReadoutViewModel(input = {}) {
  const plan = createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan();
  const envelope = normalizeSnapshotEnvelope(input);
  if (!envelope.snapshot || envelope.status !== 'ready') {
    return createHiddenViewModel({
      paneId: envelope.snapshot?.paneId || 'main',
      reason: 'snapshot-not-ready',
      snapshotReady: false,
    });
  }

  const snapshot = createTargetMaterializationReplayDiagnosticsSnapshot(envelope.snapshot);
  const targetHistoryActive = isTargetHistoryActive(snapshot);
  const fallbackOccurred = isFallbackOccurred(snapshot);

  if (!targetHistoryActive && !fallbackOccurred) {
    return createHiddenViewModel({
      paneId: snapshot.paneId,
      reason: 'normal-replay',
      snapshotReady: true,
    });
  }

  const rows = plan.firstVisibleFields.map((field) => createRow(field, snapshot));
  const modeReason = fallbackOccurred ? 'fallback' : 'target-history-active';

  return Object.freeze({
    collapsed: true,
    id: VIEW_MODEL_ID,
    mode: COLLAPSED_MODE,
    paneId: snapshot.paneId,
    reason: modeReason,
    rows: Object.freeze(rows),
    snapshotReady: true,
    title: [
      `Target materialization diagnostics: ${modeReason}`,
      `Pane: ${snapshot.paneId}`,
      `Replay cursor authority: source 1m`,
      `Target bars: display input only`,
    ].join('\n'),
    visible: true,
  });
}

export function validateTargetMaterializationReplayDiagnosticsReadoutViewModel(viewModel = {}) {
  const errors = [];
  const plan = createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan();
  const visibleFields = new Set(plan.firstVisibleFields);
  const internalFields = new Set(plan.internalOnlyFields);
  const rows = Array.isArray(viewModel.rows) ? viewModel.rows : [];

  if (viewModel.id !== VIEW_MODEL_ID) {
    errors.push(Object.freeze({ field: 'id', message: 'Readout view model id is invalid.' }));
  }
  if (![HIDDEN_MODE, COLLAPSED_MODE].includes(viewModel.mode)) {
    errors.push(Object.freeze({ field: 'mode', message: 'Readout view model mode must be hidden or collapsed.' }));
  }
  if (viewModel.mode === HIDDEN_MODE && viewModel.visible !== false) {
    errors.push(Object.freeze({ field: 'visible', message: 'Hidden readout view model must not be visible.' }));
  }
  if (viewModel.mode === COLLAPSED_MODE && viewModel.visible !== true) {
    errors.push(Object.freeze({ field: 'visible', message: 'Collapsed readout view model must be visible.' }));
  }
  for (const row of rows) {
    if (!visibleFields.has(row.field)) {
      errors.push(Object.freeze({ field: 'rows', message: `Unexpected visible diagnostics field: ${row.field}.` }));
    }
    if (internalFields.has(row.field)) {
      errors.push(Object.freeze({ field: 'rows', message: `Internal diagnostics field must remain hidden: ${row.field}.` }));
    }
  }
  for (const field of plan.firstVisibleFields) {
    if (viewModel.mode === COLLAPSED_MODE && !rows.some((row) => row.field === field)) {
      errors.push(Object.freeze({ field: 'rows', message: `Missing collapsed diagnostics field: ${field}.` }));
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}
