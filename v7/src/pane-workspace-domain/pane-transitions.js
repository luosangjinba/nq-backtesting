import { readViewportIntent } from '../viewport-runtime/public.js';
import { failPaneWorkspace } from './domain-error.js';
import {
  createPaneWorkspaceFromAccepted,
  PANE_WORKSPACE_INTERNALS,
  readPaneWorkspace,
} from './pane-workspace.js';

const { capabilityId, normalizedSync, paneId } = PANE_WORKSPACE_INTERNALS;

function exactTransition(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failPaneWorkspace(
      'PANE_WORKSPACE_TRANSITION_FIELDS_INVALID',
      'Pane transition must contain exactly the documented fields.',
    );
  }
}

function requireExistingPane(workspace, candidate) {
  const id = paneId(candidate);
  if (!workspace.panes.some((pane) => pane.paneId === id)) {
    failPaneWorkspace('PANE_WORKSPACE_TARGET_PANE_MISSING', 'Target pane is not in the workspace.');
  }
  return id;
}

/**
 * Owner: Pane Workspace Domain.
 * Purpose: change active focus without issuing a data, Replay, or instrument command.
 * Inputs: branded workspace and an existing pane id.
 * Outputs: new branded workspace preserving the exact pane records and intents.
 * Side effects/lifecycle/concurrency: none.
 * Errors: stable PaneWorkspaceDomainError for malformed or absent targets.
 */
export function focusPane(value) {
  exactTransition(value, ['paneId', 'workspace']);
  const workspace = readPaneWorkspace(value.workspace);
  const activePaneId = requireExistingPane(workspace, value.paneId);
  if (activePaneId === workspace.activePaneId) return value.workspace;
  return createPaneWorkspaceFromAccepted({ ...workspace, activePaneId });
}

/**
 * Owner: Pane Workspace Domain.
 * Purpose: apply Session-bounded pane-local or synchronized instrument intent.
 * Inputs: branded workspace, existing target pane id, and allowed instrument id.
 * Outputs: new branded workspace; unaffected pane records and every viewport
 * intent retain object identity.
 * Side effects/lifecycle/concurrency: none; materialization belongs to a later
 * Workspace Transaction Runtime step.
 * Errors: stable PaneWorkspaceDomainError before any runtime owner is invoked.
 * Protected invariant: an instrument change never creates or moves Replay state.
 */
export function changePaneInstrument(value) {
  exactTransition(value, ['instrumentId', 'paneId', 'workspace']);
  const workspace = readPaneWorkspace(value.workspace);
  const targetPaneId = requireExistingPane(workspace, value.paneId);
  const instrumentId = capabilityId(value.instrumentId, 'instrumentId');
  if (!workspace.allowedInstrumentIds.includes(instrumentId)) {
    failPaneWorkspace(
      'PANE_WORKSPACE_INSTRUMENT_OUTSIDE_SESSION',
      'A pane instrument must belong to the active Session asset set.',
    );
  }
  const targetIds = workspace.instrumentSync === 'all'
    ? new Set(workspace.panes.map((pane) => pane.paneId))
    : new Set([targetPaneId]);
  let changed = false;
  const panes = Object.freeze(workspace.panes.map((pane) => {
    if (!targetIds.has(pane.paneId) || pane.instrumentId === instrumentId) return pane;
    changed = true;
    return Object.freeze({ ...pane, instrumentId });
  }));
  if (!changed) return value.workspace;

  // Cursor equality was proved when the workspace was created; retaining the
  // exact viewport values proves this transition cannot fork the Replay clock.
  const cursorEpochMs = readViewportIntent(panes[0].viewportIntent).cursorEpochMs;
  if (panes.some((pane) => readViewportIntent(pane.viewportIntent).cursorEpochMs !== cursorEpochMs)) {
    failPaneWorkspace('PANE_WORKSPACE_SHARED_CURSOR_MISMATCH', 'Pane cursor equality was not preserved.');
  }
  return createPaneWorkspaceFromAccepted({ ...workspace, panes });
}

/** Change the effective instrument-policy snapshot without changing Pane data. */
export function setPaneInstrumentSync(value) {
  exactTransition(value, ['instrumentSync', 'workspace']);
  const workspace = readPaneWorkspace(value.workspace);
  const instrumentSync = normalizedSync(value.instrumentSync);
  if (workspace.instrumentSync === instrumentSync) return value.workspace;
  return createPaneWorkspaceFromAccepted({ ...workspace, instrumentSync });
}

/**
 * Owner: Pane Workspace Domain.
 * Purpose: apply one pane-local or complete-layout timeframe intent.
 * Protected invariant: every target retains its exact Viewport and shared cursor.
 */
export function changePaneTimeframe(value) {
  exactTransition(value, ['paneId', 'synchronize', 'timeframeId', 'workspace']);
  const workspace = readPaneWorkspace(value.workspace);
  const targetPaneId = requireExistingPane(workspace, value.paneId);
  const timeframeId = capabilityId(value.timeframeId, 'timeframeId');
  if (typeof value.synchronize !== 'boolean') {
    failPaneWorkspace(
      'PANE_WORKSPACE_TIMEFRAME_SYNC_INVALID',
      'Timeframe synchronization must be boolean.',
    );
  }
  let changed = false;
  const panes = Object.freeze(workspace.panes.map((pane) => {
    if ((!value.synchronize && pane.paneId !== targetPaneId) || pane.timeframeId === timeframeId) {
      return pane;
    }
    changed = true;
    return Object.freeze({ ...pane, timeframeId });
  }));
  if (!changed) return value.workspace;
  return createPaneWorkspaceFromAccepted({ ...workspace, panes });
}
