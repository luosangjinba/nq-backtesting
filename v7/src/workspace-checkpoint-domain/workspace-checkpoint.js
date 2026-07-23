import { failWorkspaceCheckpoint } from './domain-error.js';

const CHECKPOINT_SCHEMA = 'v7.workspace-checkpoint';
const CHECKPOINT_VERSION = 1;
const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const PANE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MODE_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const CHECKPOINT_FIELDS = Object.freeze([
  'activePaneId',
  'cursorEpochMs',
  'panes',
  'sessionHoursMode',
]);
const PANE_FIELDS = Object.freeze(['instrumentId', 'paneId', 'timeframeId', 'viewport']);
const VIEWPORT_FIELDS = Object.freeze(['latestOffsetBars', 'origin', 'spanBars']);
const WIRE_FIELDS = Object.freeze([...CHECKPOINT_FIELDS, 'schema', 'version']);

class WorkspaceCheckpointValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failWorkspaceCheckpoint(code, `${label} must contain exactly the documented fields.`);
  }
}

function requireEpoch(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failWorkspaceCheckpoint('WORKSPACE_CHECKPOINT_EPOCH_INVALID', `${label} must be a non-negative safe integer.`);
  }
  return value;
}

function requirePaneId(value, label = 'paneId') {
  if (typeof value !== 'string' || !PANE_ID_PATTERN.test(value)) {
    failWorkspaceCheckpoint('WORKSPACE_CHECKPOINT_PANE_ID_INVALID', `${label} must be an exact opaque Pane id.`);
  }
  return value;
}

function requireCapabilityId(value, label) {
  if (typeof value !== 'string' || !CAPABILITY_ID_PATTERN.test(value)) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_CAPABILITY_ID_INVALID',
      `${label} must be a namespaced capability id.`,
    );
  }
  return value;
}

function requireContext(value) {
  const startEpochMs = requireEpoch(value?.historicalRange?.startEpochMs, 'historicalRange.startEpochMs');
  const endEpochMs = requireEpoch(value?.historicalRange?.endEpochMs, 'historicalRange.endEpochMs');
  if (endEpochMs <= startEpochMs) {
    failWorkspaceCheckpoint('WORKSPACE_CHECKPOINT_RANGE_INVALID', 'Historical range end must follow its start.');
  }
  if (!Array.isArray(value?.instrumentIds) || value.instrumentIds.length === 0
    || value.instrumentIds.some((id) => typeof id !== 'string' || !CAPABILITY_ID_PATTERN.test(id))
    || new Set(value.instrumentIds).size !== value.instrumentIds.length) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_INSTRUMENTS_INVALID',
      'Checkpoint context requires unique namespaced Session instrument ids.',
    );
  }
  return Object.freeze({
    historicalRange: Object.freeze({ startEpochMs, endEpochMs }),
    instrumentIds: Object.freeze([...value.instrumentIds]),
  });
}

function requireViewport(value) {
  exactRecord(
    value,
    VIEWPORT_FIELDS,
    'WORKSPACE_CHECKPOINT_VIEWPORT_FIELDS_INVALID',
    'Checkpoint viewport',
  );
  if (value.origin !== 'default' && value.origin !== 'manual') {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_VIEWPORT_ORIGIN_INVALID',
      'Checkpoint viewport origin must be default or manual.',
    );
  }
  if (!Number.isFinite(value.latestOffsetBars)
    || (value.origin === 'default' && value.latestOffsetBars < 0)) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_VIEWPORT_OFFSET_INVALID',
      'Checkpoint latest-bar offset must be finite and may be negative only for a manual viewport.',
    );
  }
  if ((value.origin === 'default' && value.spanBars !== null)
    || (value.origin === 'manual' && (!Number.isFinite(value.spanBars) || value.spanBars <= 0))) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_VIEWPORT_SPAN_INVALID',
      'Default viewport span must be null and manual viewport span must be positive.',
    );
  }
  return Object.freeze({
    latestOffsetBars: value.latestOffsetBars,
    origin: value.origin,
    spanBars: value.spanBars,
  });
}

function requirePane(value, context) {
  exactRecord(value, PANE_FIELDS, 'WORKSPACE_CHECKPOINT_PANE_FIELDS_INVALID', 'Checkpoint Pane');
  const instrumentId = requireCapabilityId(value.instrumentId, 'pane.instrumentId');
  if (!context.instrumentIds.includes(instrumentId)) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_INSTRUMENT_OUTSIDE_SESSION',
      'Checkpoint Pane instrument must belong to the Session asset set.',
    );
  }
  return Object.freeze({
    instrumentId,
    paneId: requirePaneId(value.paneId),
    timeframeId: requireCapabilityId(value.timeframeId, 'pane.timeframeId'),
    viewport: requireViewport(value.viewport),
  });
}

function createValue(value, contextValue) {
  exactRecord(value, CHECKPOINT_FIELDS, 'WORKSPACE_CHECKPOINT_FIELDS_INVALID', 'Workspace checkpoint');
  const context = requireContext(contextValue);
  const cursorEpochMs = requireEpoch(value.cursorEpochMs, 'cursorEpochMs');
  if (cursorEpochMs < context.historicalRange.startEpochMs
    || cursorEpochMs > context.historicalRange.endEpochMs) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_CURSOR_OUTSIDE_SESSION',
      'Checkpoint cursor must remain inside the Session historical range.',
    );
  }
  if (!Array.isArray(value.panes) || value.panes.length < 1 || value.panes.length > 4) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_PANES_INVALID',
      'Workspace checkpoint requires one through four Panes.',
    );
  }
  const panes = Object.freeze(value.panes.map((pane) => requirePane(pane, context)));
  if (new Set(panes.map(({ paneId }) => paneId)).size !== panes.length) {
    failWorkspaceCheckpoint('WORKSPACE_CHECKPOINT_PANE_DUPLICATE', 'Checkpoint Pane ids must be unique.');
  }
  const activePaneId = requirePaneId(value.activePaneId, 'activePaneId');
  if (!panes.some(({ paneId }) => paneId === activePaneId)) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_ACTIVE_PANE_MISSING',
      'Checkpoint active Pane must belong to the saved Pane set.',
    );
  }
  if (typeof value.sessionHoursMode !== 'string' || !MODE_PATTERN.test(value.sessionHoursMode)) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_SESSION_HOURS_INVALID',
      'Checkpoint Session Hours mode must be an exact lowercase mode token.',
    );
  }
  return new WorkspaceCheckpointValue({
    activePaneId,
    cursorEpochMs,
    panes,
    sessionHoursMode: value.sessionHoursMode,
  });
}

/** Create one durable, data-independent Session Workspace checkpoint. */
export function createWorkspaceCheckpoint(value, context) {
  return createValue(value, context);
}

/** Read the immutable semantic checkpoint value. */
export function readWorkspaceCheckpoint(candidate) {
  if (!(candidate instanceof WorkspaceCheckpointValue)) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_REQUIRED',
      'A branded Workspace checkpoint is required.',
    );
  }
  return candidate.read();
}

/** Serialize the checkpoint without native chart coordinates or cached bars. */
export function serializeWorkspaceCheckpoint(checkpoint) {
  const value = readWorkspaceCheckpoint(checkpoint);
  return Object.freeze({
    ...value,
    schema: CHECKPOINT_SCHEMA,
    version: CHECKPOINT_VERSION,
  });
}

/** Restore and validate one versioned checkpoint against its owning Session. */
export function deserializeWorkspaceCheckpoint(value, context) {
  exactRecord(value, WIRE_FIELDS, 'WORKSPACE_CHECKPOINT_WIRE_INVALID', 'Workspace checkpoint wire');
  if (value.schema !== CHECKPOINT_SCHEMA || value.version !== CHECKPOINT_VERSION) {
    failWorkspaceCheckpoint(
      'WORKSPACE_CHECKPOINT_WIRE_INVALID',
      'Persisted Workspace checkpoint schema is unsupported.',
    );
  }
  const { schema: _schema, version: _version, ...checkpoint } = value;
  return createValue(checkpoint, context);
}
