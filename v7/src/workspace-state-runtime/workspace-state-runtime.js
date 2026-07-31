import {
  activationGenerationsEqual,
  requireActivationGeneration,
} from '../activation-generation/public.js';
import { readPaneWorkspace } from '../pane-workspace-domain/public.js';
import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import { createTransactionId, serializeTransactionId } from '../transaction-identity/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import { createWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';
import {
  createWorkspaceTransactionIdentity,
  readWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import { createOwnedPaneState } from './owned-pane-state.js';
import { createPreparedWorkspaceStateCommit } from './prepared-workspace-state-commit.js';
import { failWorkspaceState } from './runtime-error.js';
import {
  createWorkspaceStateSnapshot,
  readWorkspaceStateSnapshot,
} from './state-snapshot.js';

function requireExactString(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    failWorkspaceState('WORKSPACE_STATE_CONFIG_INVALID', `${field} must be an exact non-empty string.`);
  }
  return value;
}

function requireSessionHoursModes(value) {
  if (!Array.isArray(value) || value.length === 0
    || value.some((mode) => typeof mode !== 'string' || mode.length === 0)
    || new Set(value).size !== value.length) {
    failWorkspaceState(
      'WORKSPACE_STATE_CONFIG_INVALID',
      'Workspace State requires unique Session Hours modes.',
    );
  }
  return Object.freeze([...value]);
}

function transactionKey(identity) {
  return serializeTransactionId(readWorkspaceTransactionIdentity(identity).transactionId).value;
}

function requireRuntimeConfiguration({
  activationGeneration,
  calendarRevision,
  initialSessionHoursMode,
  sessionHoursModes,
  sessionId,
}) {
  const scope = Object.freeze({
    activationGeneration: requireActivationGeneration(activationGeneration),
    sessionId: requireSessionId(sessionId),
  });
  const modes = requireSessionHoursModes(sessionHoursModes);
  const expectedCalendarRevision = requireExactString(calendarRevision, 'calendarRevision');
  if (!modes.includes(initialSessionHoursMode)) {
    failWorkspaceState(
      'WORKSPACE_STATE_SESSION_HOURS_MODE_INVALID',
      'Initial Session Hours mode is not supported.',
    );
  }
  return Object.freeze({ expectedCalendarRevision, modes, scope });
}

function createPaneOwner(options, onViewportAccepted) {
  return createOwnedPaneState({
    activationGeneration: options.scope.activationGeneration,
    allowedInstrumentIds: options.allowedInstrumentIds,
    initialCheckpoint: options.initialCheckpoint,
    initialCursorEpochMs: options.initialCursorEpochMs,
    initialPaneCount: options.initialPaneCount,
    initialRightMarginBars: options.initialRightMarginBars,
    initialTarget: options.initialTarget,
    onViewportAccepted,
    paneIds: options.paneIds,
    primaryInstrumentId: options.primaryInstrumentId,
    sessionId: options.scope.sessionId,
  });
}

function createInitialSnapshot(scope, panes, sessionHours, checkpointFor, seenTransactionKeys) {
  const identity = createWorkspaceTransactionIdentity({
    ...scope,
    transactionId: createTransactionId('workspace-state.initial'),
  });
  seenTransactionKeys.add(transactionKey(identity));
  return createWorkspaceStateSnapshot({
    checkpoint: checkpointFor(panes.current(), sessionHours),
    identity,
    paneWorkspace: panes.current(),
    revision: 0,
    sessionHours,
  });
}

/** Own the accepted Pane, Session Hours, Viewport, and checkpoint semantic state. */
export function createWorkspaceStateRuntime({
  activationGeneration,
  allowedInstrumentIds,
  calendarRevision,
  checkpointContext,
  initialCheckpoint = null,
  initialCursorEpochMs,
  initialPaneCount = 1,
  initialRightMarginBars = 12,
  initialSessionHoursMode,
  initialTarget,
  paneIds,
  primaryInstrumentId,
  sessionHoursModes,
  sessionId,
}) {
  const { expectedCalendarRevision, modes, scope } = requireRuntimeConfiguration({
    activationGeneration,
    calendarRevision,
    initialSessionHoursMode,
    sessionHoursModes,
    sessionId,
  });
  let disposed = false;
  let revision = 0;
  let localSequence = 0;
  let currentIdentity = null;
  let snapshot = null;
  const seenTransactionKeys = new Set();
  let sessionHours = Object.freeze({
    calendarRevision: expectedCalendarRevision,
    mode: initialSessionHoursMode,
    revision: 0,
  });

  function requireActive() {
    if (disposed) {
      failWorkspaceState('WORKSPACE_STATE_RUNTIME_DISPOSED', 'Workspace State Runtime is disposed.');
    }
  }

  function requireScopedIdentity(identity) {
    const parts = readWorkspaceTransactionIdentity(identity);
    if (!sessionIdsEqual(parts.sessionId, scope.sessionId)) {
      failWorkspaceState(
        'WORKSPACE_STATE_SESSION_MISMATCH',
        'Workspace State identity belongs to another Session.',
      );
    }
    if (!activationGenerationsEqual(parts.activationGeneration, scope.activationGeneration)) {
      failWorkspaceState(
        'WORKSPACE_STATE_ACTIVATION_MISMATCH',
        'Workspace State identity belongs to another activation.',
      );
    }
    return identity;
  }

  function localIdentity(operation) {
    localSequence += 1;
    const identity = createWorkspaceTransactionIdentity({
      ...scope,
      transactionId: createTransactionId(`workspace-state.${operation}-${localSequence}`),
    });
    seenTransactionKeys.add(transactionKey(identity));
    return identity;
  }

  function checkpointFor(paneWorkspace, acceptedSessionHours) {
    const workspace = readPaneWorkspace(paneWorkspace);
    const cursorEpochMs = readViewportIntent(workspace.panes[0].viewportIntent).cursorEpochMs;
    return createWorkspaceCheckpoint({
      activePaneId: workspace.activePaneId,
      cursorEpochMs,
      panes: workspace.panes.map((pane) => {
        const viewport = readViewportIntent(pane.viewportIntent);
        return {
          instrumentId: pane.instrumentId,
          paneId: pane.paneId,
          timeframeId: pane.timeframeId,
          viewport: {
            latestOffsetBars: viewport.latestOffsetBars,
            origin: viewport.origin,
            spanBars: viewport.spanBars,
          },
        };
      }),
      sessionHoursMode: acceptedSessionHours.mode,
    }, checkpointContext);
  }

  function publish(identity, paneWorkspace, acceptedSessionHours) {
    if (revision === Number.MAX_SAFE_INTEGER) {
      failWorkspaceState('WORKSPACE_STATE_REVISION_EXHAUSTED', 'Workspace State revision is exhausted.');
    }
    revision += 1;
    snapshot = createWorkspaceStateSnapshot({
      checkpoint: checkpointFor(paneWorkspace, acceptedSessionHours),
      identity,
      paneWorkspace,
      revision,
      sessionHours: acceptedSessionHours,
    });
    return snapshot;
  }

  function commitLocal(operation, paneWorkspace) {
    requireActive();
    return publish(localIdentity(operation), paneWorkspace, sessionHours);
  }

  function beginTransaction(identity) {
    requireActive();
    const scopedIdentity = requireScopedIdentity(identity);
    const key = transactionKey(scopedIdentity);
    if (seenTransactionKeys.has(key)) {
      failWorkspaceState(
        'WORKSPACE_STATE_TRANSACTION_DUPLICATE',
        'A Workspace State transaction identity may begin exactly once.',
      );
    }
    seenTransactionKeys.add(key);
    currentIdentity = scopedIdentity;
    return scopedIdentity;
  }

  const panes = createPaneOwner({
    allowedInstrumentIds,
    initialCheckpoint,
    initialCursorEpochMs,
    initialPaneCount,
    initialRightMarginBars,
    initialTarget,
    paneIds,
    primaryInstrumentId,
    scope,
  }, (paneWorkspace) => commitLocal('viewport', paneWorkspace));
  snapshot = createInitialSnapshot(scope, panes, sessionHours, checkpointFor, seenTransactionKeys);

  function normalizeSessionHours(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join(',') !== 'calendarRevision,mode,revision') {
      failWorkspaceState(
        'WORKSPACE_STATE_SESSION_HOURS_INVALID',
        'Session Hours must contain calendarRevision, mode, and revision.',
      );
    }
    if (value.calendarRevision !== expectedCalendarRevision || !modes.includes(value.mode)) {
      failWorkspaceState(
        'WORKSPACE_STATE_SESSION_HOURS_INVALID',
        'Session Hours capability differs from this runtime.',
      );
    }
    const expectedRevision = value.mode === sessionHours.mode
      ? sessionHours.revision : sessionHours.revision + 1;
    if (!Number.isSafeInteger(value.revision) || value.revision !== expectedRevision) {
      failWorkspaceState(
        'WORKSPACE_STATE_SESSION_HOURS_REVISION_INVALID',
        'Session Hours revision must retain or advance exactly once with its mode.',
      );
    }
    return Object.freeze({
      calendarRevision: expectedCalendarRevision,
      mode: value.mode,
      revision: value.revision,
    });
  }

  function prepareAcceptance({ cursorEpochMs, identity, paneWorkspace, sessionHours: nextSessionHours }) {
    requireActive();
    const scopedIdentity = requireScopedIdentity(identity);
    if (currentIdentity === null
      || !workspaceTransactionIdentitiesEqual(scopedIdentity, currentIdentity)) {
      failWorkspaceState(
        'WORKSPACE_STATE_TRANSACTION_NOT_CURRENT',
        'Only the current begun Workspace transaction may prepare semantic state.',
      );
    }
    if (revision === Number.MAX_SAFE_INTEGER) {
      failWorkspaceState('WORKSPACE_STATE_REVISION_EXHAUSTED', 'Workspace State revision is exhausted.');
    }
    const acceptedSessionHours = normalizeSessionHours(nextSessionHours);
    const acceptedWorkspace = panes.candidate(paneWorkspace, cursorEpochMs);
    const candidateSnapshot = createWorkspaceStateSnapshot({
      checkpoint: checkpointFor(acceptedWorkspace, acceptedSessionHours),
      identity: scopedIdentity,
      paneWorkspace: acceptedWorkspace,
      revision: revision + 1,
      sessionHours: acceptedSessionHours,
    });
    const candidate = readWorkspaceStateSnapshot(candidateSnapshot);
    const previous = Object.freeze({
      paneState: panes.capture(),
      revision,
      sessionHours,
      snapshot,
    });
    let applied = false;

    function release() {
      if (currentIdentity !== null
        && workspaceTransactionIdentitiesEqual(scopedIdentity, currentIdentity)) {
        currentIdentity = null;
      }
    }

    return createPreparedWorkspaceStateCommit({
      baseRevision: revision,
      candidate,
      hooks: Object.freeze({
        apply() {
          if (currentIdentity === null
            || !workspaceTransactionIdentitiesEqual(scopedIdentity, currentIdentity)
            || revision !== previous.revision) {
            failWorkspaceState(
              'WORKSPACE_STATE_TRANSACTION_NOT_CURRENT',
              'Prepared Workspace State is stale.',
            );
          }
          panes.replace(acceptedWorkspace);
          sessionHours = acceptedSessionHours;
          revision = previous.revision + 1;
          snapshot = candidateSnapshot;
          applied = true;
        },
        finalize() {
          if (!applied || snapshot !== candidateSnapshot || revision !== previous.revision + 1) {
            failWorkspaceState(
              'WORKSPACE_STATE_PREPARED_COMMIT_STALE',
              'Prepared Workspace State candidate is no longer applied.',
            );
          }
          release();
        },
        release,
        rollback() {
          if (applied) {
            panes.restore(previous.paneState);
            revision = previous.revision;
            sessionHours = previous.sessionHours;
            snapshot = previous.snapshot;
            applied = false;
          }
          release();
        },
      }),
      identity: scopedIdentity,
    });
  }

  return Object.freeze({
    accept({ cursorEpochMs, identity, paneWorkspace, sessionHours: nextSessionHours }) {
      const prepared = prepareAcceptance({ cursorEpochMs, identity, paneWorkspace, sessionHours: nextSessionHours });
      const receipt = prepared.apply();
      prepared.finalize(receipt);
      return snapshot;
    },
    activePaneId: panes.activePaneId,
    begin(identity) {
      return beginTransaction(identity);
    },
    checkpoint() {
      requireActive();
      return readWorkspaceStateSnapshot(snapshot).checkpoint;
    },
    desiredInstrument: panes.desiredInstrument,
    desiredPaneCount: panes.desiredPaneCount,
    desiredTimeframe: panes.desiredTimeframe,
    dispose() {
      if (disposed) return;
      disposed = true;
      currentIdentity = null;
      panes.dispose();
    },
    focus(paneId) {
      requireActive();
      if (!panes.focus(paneId)) return snapshot;
      return commitLocal('focus', panes.current());
    },
    paneIds: panes.paneIds,
    prepare: prepareAcceptance,
    proposeSessionHours(mode) {
      requireActive();
      if (!modes.includes(mode)) {
        failWorkspaceState(
          'WORKSPACE_STATE_SESSION_HOURS_MODE_INVALID',
          'Session Hours mode is not supported.',
        );
      }
      return mode === sessionHours.mode ? sessionHours : Object.freeze({
        calendarRevision: expectedCalendarRevision,
        mode,
        revision: sessionHours.revision + 1,
      });
    },
    read: readPaneWorkspace,
    readDefaultRightMarginBars: panes.readDefaultRightMarginBars,
    reject(identity) {
      requireActive();
      const scopedIdentity = requireScopedIdentity(identity);
      if (currentIdentity !== null
        && workspaceTransactionIdentitiesEqual(scopedIdentity, currentIdentity)) {
        currentIdentity = null;
      }
    },
    setDefaultRightMarginBars: panes.setDefaultRightMarginBars,
    snapshot() {
      requireActive();
      return snapshot;
    },
    viewportPort: panes.viewportPort,
    wallOrigin: panes.wallOrigin,
  });
}
