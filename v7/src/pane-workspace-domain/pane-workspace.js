import {
  activationGenerationsEqual,
  requireActivationGeneration,
} from '../activation-generation/public.js';
import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import { failPaneWorkspace } from './domain-error.js';

const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const PANE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const WORKSPACE_FIELDS = Object.freeze([
  'activationGeneration',
  'activePaneId',
  'allowedInstrumentIds',
  'instrumentSync',
  'panes',
  'primaryInstrumentId',
  'sessionId',
]);
const PANE_FIELDS = Object.freeze(['instrumentId', 'paneId', 'timeframeId', 'viewportIntent']);

class PaneWorkspaceValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failPaneWorkspace(code, `${label} must contain exactly the documented fields.`);
  }
}

function paneId(value, label = 'paneId') {
  if (typeof value !== 'string' || !PANE_ID_PATTERN.test(value)) {
    failPaneWorkspace('PANE_WORKSPACE_PANE_ID_INVALID', `${label} must be an exact opaque pane id.`);
  }
  return value;
}

function capabilityId(value, label) {
  if (typeof value !== 'string' || !CAPABILITY_ID_PATTERN.test(value)) {
    failPaneWorkspace('PANE_WORKSPACE_CAPABILITY_ID_INVALID', `${label} must be a namespaced capability id.`);
  }
  return value;
}

function normalizedInstrumentIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    failPaneWorkspace(
      'PANE_WORKSPACE_ALLOWED_INSTRUMENTS_INVALID',
      'Session allowed instruments must be a non-empty array.',
    );
  }
  const result = value.map((id) => capabilityId(id, 'allowedInstrumentIds'));
  if (new Set(result).size !== result.length) {
    failPaneWorkspace(
      'PANE_WORKSPACE_ALLOWED_INSTRUMENTS_DUPLICATE',
      'Session allowed instruments must be unique.',
    );
  }
  return Object.freeze(result);
}

function normalizedPane(value, scope, allowedInstrumentIds) {
  exactRecord(value, PANE_FIELDS, 'PANE_WORKSPACE_PANE_FIELDS_INVALID', 'Pane');
  const id = paneId(value.paneId);
  const instrumentId = capabilityId(value.instrumentId, 'pane.instrumentId');
  if (!allowedInstrumentIds.includes(instrumentId)) {
    failPaneWorkspace(
      'PANE_WORKSPACE_INSTRUMENT_OUTSIDE_SESSION',
      'A pane instrument must belong to the active Session asset set.',
    );
  }
  const viewport = readViewportIntent(value.viewportIntent);
  if (viewport.scope.paneId !== id) {
    failPaneWorkspace('PANE_WORKSPACE_VIEWPORT_PANE_MISMATCH', 'Viewport intent belongs to another pane.');
  }
  if (!sessionIdsEqual(viewport.scope.sessionId, scope.sessionId)) {
    failPaneWorkspace('PANE_WORKSPACE_VIEWPORT_SESSION_MISMATCH', 'Viewport intent belongs to another Session.');
  }
  if (!activationGenerationsEqual(
    viewport.scope.activationGeneration,
    scope.activationGeneration,
  )) {
    failPaneWorkspace(
      'PANE_WORKSPACE_VIEWPORT_ACTIVATION_MISMATCH',
      'Viewport intent belongs to another Session activation.',
    );
  }
  return Object.freeze({
    instrumentId,
    paneId: id,
    timeframeId: capabilityId(value.timeframeId, 'pane.timeframeId'),
    viewportIntent: value.viewportIntent,
  });
}

function normalizedPanes(value, scope, allowedInstrumentIds) {
  if (!Array.isArray(value) || value.length === 0) {
    failPaneWorkspace('PANE_WORKSPACE_PANES_INVALID', 'A Pane Workspace requires at least one pane.');
  }
  const panes = value.map((pane) => normalizedPane(pane, scope, allowedInstrumentIds));
  if (new Set(panes.map((pane) => pane.paneId)).size !== panes.length) {
    failPaneWorkspace('PANE_WORKSPACE_PANE_DUPLICATE', 'Pane ids must be unique.');
  }
  const cursorEpochMs = readViewportIntent(panes[0].viewportIntent).cursorEpochMs;
  if (panes.some((pane) => readViewportIntent(pane.viewportIntent).cursorEpochMs !== cursorEpochMs)) {
    failPaneWorkspace(
      'PANE_WORKSPACE_SHARED_CURSOR_MISMATCH',
      'All pane viewport intents must observe the same Replay cursor.',
    );
  }
  return Object.freeze(panes);
}

function normalizedSync(value) {
  if (value !== 'pane' && value !== 'all') {
    failPaneWorkspace('PANE_WORKSPACE_INSTRUMENT_SYNC_INVALID', 'Instrument sync must be pane or all.');
  }
  return value;
}

function createValue(value) {
  return new PaneWorkspaceValue(value);
}

/**
 * Owner: Pane Workspace Domain.
 * Purpose: create the uniform immutable record used for one or many chart panes.
 * Inputs: exact Session scope, Session asset set, active pane, sync mode, and pane-local intents.
 * Outputs: branded immutable Pane Workspace value with stable pane order.
 * Side effects/lifecycle: none.
 * Errors: PaneWorkspaceDomainError or a required identity/viewport contract error.
 * Protected invariants: panes contain no Replay state, every instrument belongs
 * to the Session, and all viewport intents observe one shared Replay cursor.
 */
export function createPaneWorkspace(value) {
  exactRecord(value, WORKSPACE_FIELDS, 'PANE_WORKSPACE_FIELDS_INVALID', 'Pane Workspace input');
  const scope = Object.freeze({
    activationGeneration: requireActivationGeneration(value.activationGeneration),
    sessionId: requireSessionId(value.sessionId),
  });
  const allowedInstrumentIds = normalizedInstrumentIds(value.allowedInstrumentIds);
  const primaryInstrumentId = capabilityId(value.primaryInstrumentId, 'primaryInstrumentId');
  if (!allowedInstrumentIds.includes(primaryInstrumentId)) {
    failPaneWorkspace(
      'PANE_WORKSPACE_PRIMARY_INSTRUMENT_INVALID',
      'Primary instrument must belong to the active Session asset set.',
    );
  }
  const panes = normalizedPanes(value.panes, scope, allowedInstrumentIds);
  const activePaneId = paneId(value.activePaneId, 'activePaneId');
  if (!panes.some((pane) => pane.paneId === activePaneId)) {
    failPaneWorkspace('PANE_WORKSPACE_ACTIVE_PANE_MISSING', 'Active pane must reference a workspace pane.');
  }
  return createValue({
    activePaneId,
    allowedInstrumentIds,
    instrumentSync: normalizedSync(value.instrumentSync),
    panes,
    primaryInstrumentId,
    schemaVersion: 1,
    scope,
  });
}

/**
 * Owner: Pane Workspace Domain.
 * Purpose: read a validated Pane Workspace without accepting structural lookalikes.
 * Inputs/outputs: branded workspace; returns its deeply immutable semantic value.
 * Side effects/lifecycle: none.
 * Errors: PANE_WORKSPACE_REQUIRED.
 */
export function readPaneWorkspace(candidate) {
  if (!(candidate instanceof PaneWorkspaceValue)) {
    failPaneWorkspace('PANE_WORKSPACE_REQUIRED', 'A branded Pane Workspace is required.');
  }
  return candidate.read();
}

export function createPaneWorkspaceFromAccepted(value) {
  return createValue(value);
}

export const PANE_WORKSPACE_INTERNALS = Object.freeze({ capabilityId, normalizedSync, paneId });
