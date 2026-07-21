import { readPaneWorkspace } from '../pane-workspace-domain/public.js';
import { createReplayRange, requireCursorInRange } from '../replay-contract/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import { readReplayPaneAction } from './action-intent.js';
import { failReplayPaneResponse } from './response-error.js';

const PLAN_FIELDS = Object.freeze(['action', 'paneWorkspace', 'replayRange', 'sessionHours']);
const SESSION_HOURS_FIELDS = Object.freeze(['calendarRevision', 'mode', 'revision']);

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failReplayPaneResponse(code, `${label} must contain exactly the documented fields.`);
  }
}

function sessionHours(value) {
  exactRecord(
    value,
    SESSION_HOURS_FIELDS,
    'REPLAY_PANE_SESSION_HOURS_FIELDS_INVALID',
    'Session Hours',
  );
  if (value.mode !== 'eth' && value.mode !== 'rth') {
    failReplayPaneResponse('REPLAY_PANE_SESSION_HOURS_MODE_INVALID', 'Session Hours mode must be eth or rth.');
  }
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) {
    failReplayPaneResponse(
      'REPLAY_PANE_SESSION_HOURS_REVISION_INVALID',
      'Session Hours revision must be a non-negative safe integer.',
    );
  }
  if (typeof value.calendarRevision !== 'string' || value.calendarRevision.length === 0
    || value.calendarRevision.trim() !== value.calendarRevision) {
    failReplayPaneResponse(
      'REPLAY_PANE_CALENDAR_REVISION_INVALID',
      'Calendar revision must be an exact non-empty string.',
    );
  }
  return Object.freeze({
    calendarRevision: value.calendarRevision,
    mode: value.mode,
    revision: value.revision,
    scope: 'session',
  });
}

function targetSemantics(action, cursorEpochMs, replayRange) {
  if (action.kind === 'manual-next' || action.kind === 'autoplay-next') {
    return Object.freeze({
      coverage: 'next-eligible-source-step',
      direction: 'forward',
      requestedTargetEpochMs: null,
      resolution: 'next-eligible-primary-source',
    });
  }
  if (action.kind === 'manual-previous') {
    return Object.freeze({
      coverage: 'replace-through-resolved-target',
      direction: 'backward',
      requestedTargetEpochMs: null,
      resolution: 'previous-eligible-primary-source',
    });
  }
  if (action.kind === 'goto-anchor') {
    return Object.freeze({
      coverage: 'complete-forward-range',
      direction: 'forward',
      requestedTargetEpochMs: null,
      resolution: 'next-real-source-after-new-york-anchor',
    });
  }

  const target = requireCursorInRange(action.targetEpochMs, replayRange);
  if (action.kind === 'restart-back-to' && target >= cursorEpochMs) {
    failReplayPaneResponse(
      'REPLAY_PANE_BACK_TO_NOT_BACKWARD',
      'Restart/Back-to target must be earlier than the accepted cursor.',
    );
  }
  const direction = target > cursorEpochMs ? 'forward' : target < cursorEpochMs ? 'backward' : 'retain';
  return Object.freeze({
    coverage: direction === 'forward'
      ? 'complete-forward-range'
      : direction === 'backward' ? 'replace-through-target' : 'none',
    direction,
    requestedTargetEpochMs: target,
    resolution: action.kind === 'restart-back-to'
      ? 'selected-source-exclusive-cutoff'
      : 'exact-session-cutoff',
  });
}

function paneResponse(pane) {
  return Object.freeze({
    instrumentId: pane.instrumentId,
    missingBars: 'allow-earlier-or-empty-visible-through',
    paneId: pane.paneId,
    projection: 'reproject-at-shared-cursor',
    timeframeId: pane.timeframeId,
    viewport: 'preserve-pane-local-intent',
    viewportIntent: pane.viewportIntent,
  });
}

/**
 * Owner: Workspace Transaction Runtime contract boundary.
 * Purpose: plan how one Replay action affects the complete visible Pane set.
 * Inputs: branded action and Pane Workspace, Replay range, and one Session-level
 * Session Hours/calendar revision.
 * Outputs: deeply immutable response plan; it performs no target lookup or I/O.
 * Side effects/lifecycle/concurrency: none.
 * Errors: stable response errors or delegated branded-contract errors.
 * Protected invariants: active focus never narrows Replay scope, the Session
 * primary instrument is clock authority, all Panes reproject against one
 * cursor, forward jumps cover the complete interval, and commit is all-or-none.
 */
export function planReplayPaneResponse(value) {
  exactRecord(value, PLAN_FIELDS, 'REPLAY_PANE_PLAN_FIELDS_INVALID', 'Replay Pane plan input');
  const action = readReplayPaneAction(value.action);
  const workspace = readPaneWorkspace(value.paneWorkspace);
  const replayRange = createReplayRange(value.replayRange);
  const cursorEpochMs = requireCursorInRange(
    readViewportIntent(workspace.panes[0].viewportIntent).cursorEpochMs,
    replayRange,
  );
  const target = targetSemantics(action, cursorEpochMs, replayRange);
  const panes = Object.freeze(workspace.panes.map(paneResponse));
  return Object.freeze({
    action: value.action,
    actionKind: action.kind,
    activePaneId: workspace.activePaneId,
    affectedPaneIds: Object.freeze(panes.map((pane) => pane.paneId)),
    anchor: action.anchor,
    atomicity: Object.freeze({
      commit: 'replay-and-complete-pane-set-after-exact-visible-completion',
      failure: 'preserve-last-accepted-workspace-and-pause',
      overlap: 'single-in-flight-no-autoplay-backlog',
    }),
    cursorAuthorityInstrumentId: workspace.primaryInstrumentId,
    fromCursorEpochMs: cursorEpochMs,
    paneResponses: panes,
    schemaVersion: 1,
    sessionHours: sessionHours(value.sessionHours),
    target,
  });
}
