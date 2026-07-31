import { activationGenerationsEqual } from '../activation-generation/public.js';
import {
  changePaneInstrument,
  changePaneTimeframe,
  createPaneWorkspace,
  focusPane,
  readPaneWorkspace,
  setPaneInstrumentSync,
} from '../pane-workspace-domain/public.js';
import { sessionIdsEqual } from '../session-identity/public.js';
import {
  createInitialViewportIntent,
  createViewportController,
  moveViewportIntentCursor,
  readViewportIntent,
  restoreViewportIntent,
} from '../viewport-runtime/public.js';
import { readWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';
import { failWorkspaceState } from './runtime-error.js';

function requirePaneIds(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4
    || value.some((paneId) => typeof paneId !== 'string' || paneId.length === 0)
    || new Set(value).size !== value.length) {
    failWorkspaceState(
      'WORKSPACE_STATE_PANE_IDS_INVALID',
      'Workspace State requires one through four unique Pane ids.',
    );
  }
  return Object.freeze([...value]);
}

/** Own Pane Workspace construction and every mutable Viewport controller. */
export function createOwnedPaneState({
  activationGeneration,
  allowedInstrumentIds,
  initialCheckpoint,
  initialCursorEpochMs,
  initialPaneCount,
  initialRightMarginBars,
  initialTarget,
  onViewportAccepted,
  paneIds: paneIdsValue,
  primaryInstrumentId,
  sessionId,
}) {
  const paneIds = requirePaneIds(paneIdsValue);
  const primaryPaneId = paneIds[0];
  const viewports = new Map();
  const viewportPorts = new Map();
  let accepted = null;
  let defaultRightMarginBars = initialRightMarginBars;
  const restored = initialCheckpoint === null ? null : readWorkspaceCheckpoint(initialCheckpoint);
  if (restored && restored.cursorEpochMs !== initialCursorEpochMs) {
    failWorkspaceState(
      'WORKSPACE_STATE_RESTORE_CURSOR_MISMATCH',
      'Restored Pane Workspace cursor must match the Replay checkpoint cursor.',
    );
  }
  if (restored && restored.panes.length !== initialPaneCount) {
    failWorkspaceState(
      'WORKSPACE_STATE_RESTORE_LAYOUT_MISMATCH',
      'Restored Pane Workspace must match its Pane Layout count.',
    );
  }
  if (restored && restored.panes.some(({ paneId }, index) => paneId !== paneIds[index])) {
    failWorkspaceState(
      'WORKSPACE_STATE_RESTORE_PANE_ORDER_MISMATCH',
      'Restored Pane Workspace must use the configured stable Pane priority prefix.',
    );
  }
  const restoredPanes = new Map(restored?.panes.map((pane) => [pane.paneId, pane]) ?? []);

  function requireCompatibleWorkspace(workspace) {
    const value = readPaneWorkspace(workspace);
    if (!sessionIdsEqual(value.scope.sessionId, sessionId)) {
      failWorkspaceState(
        'WORKSPACE_STATE_PANE_SESSION_MISMATCH',
        'Pane Workspace belongs to another Session.',
      );
    }
    if (!activationGenerationsEqual(value.scope.activationGeneration, activationGeneration)) {
      failWorkspaceState(
        'WORKSPACE_STATE_PANE_ACTIVATION_MISMATCH',
        'Pane Workspace belongs to another activation.',
      );
    }
    if (value.primaryInstrumentId !== primaryInstrumentId
      || value.allowedInstrumentIds.length !== allowedInstrumentIds.length
      || value.allowedInstrumentIds.some((id, index) => id !== allowedInstrumentIds[index])) {
      failWorkspaceState(
        'WORKSPACE_STATE_PANE_CAPABILITY_MISMATCH',
        'Pane Workspace capabilities differ from this runtime.',
      );
    }
    if (value.panes.length > paneIds.length
      || value.panes.some((pane, index) => pane.paneId !== paneIds[index])) {
      failWorkspaceState(
        'WORKSPACE_STATE_PANE_ORDER_MISMATCH',
        'Pane Workspace must use the configured stable Pane priority prefix.',
      );
    }
    return value;
  }

  function viewport(paneId, cursorEpochMs = initialCursorEpochMs) {
    if (!paneIds.includes(paneId)) {
      failWorkspaceState('WORKSPACE_STATE_PANE_UNKNOWN', 'Viewport Pane is not configured.');
    }
    if (!viewports.has(paneId)) {
      const saved = restoredPanes.get(paneId)?.viewport ?? null;
      viewports.set(paneId, createViewportController({
        defaultLatestOffsetBars: defaultRightMarginBars,
        defaultSpanBars: 80,
        initialIntent: saved === null
          ? createInitialViewportIntent({
            activationGeneration,
            cursorEpochMs,
            latestOffsetBars: defaultRightMarginBars,
            paneId,
            sessionId,
          })
          : restoreViewportIntent({
            activationGeneration,
            cursorEpochMs,
            latestOffsetBars: saved.latestOffsetBars,
            origin: saved.origin,
            paneId,
            sessionId,
            spanBars: saved.spanBars,
          }),
      }));
    }
    return viewports.get(paneId);
  }

  function build({ activePaneId, instrumentSync = 'pane', panes }) {
    return createPaneWorkspace({
      activationGeneration,
      activePaneId,
      allowedInstrumentIds,
      instrumentSync,
      panes: panes.map((pane) => ({
        instrumentId: pane.instrumentId,
        paneId: pane.paneId,
        timeframeId: pane.timeframeId,
        viewportIntent: viewport(pane.paneId).snapshot(),
      })),
      primaryInstrumentId,
      sessionId,
    });
  }

  function rebuild(workspace, transform = (value) => value) {
    const next = transform(readPaneWorkspace(workspace));
    return build({
      activePaneId: next.activePaneId,
      instrumentSync: next.instrumentSync,
      panes: next.panes,
    });
  }

  accepted = build(restored === null
    ? {
      activePaneId: primaryPaneId,
      panes: paneIds.slice(0, initialPaneCount).map((paneId) => ({
        instrumentId: initialTarget.instrumentId,
        paneId,
        timeframeId: initialTarget.timeframeId,
      })),
    }
    : {
      activePaneId: restored.activePaneId,
      panes: restored.panes,
    });

  function viewportPort(paneId) {
    if (viewportPorts.has(paneId)) return viewportPorts.get(paneId);
    const controller = viewport(paneId);
    const port = Object.freeze({
      captureManual(input) {
        const intent = controller.captureManual(input);
        accepted = rebuild(accepted);
        onViewportAccepted(accepted);
        return intent;
      },
      project: controller.project,
      reset(latestOffsetBars) {
        const intent = controller.reset(latestOffsetBars);
        accepted = rebuild(accepted);
        onViewportAccepted(accepted);
        return intent;
      },
      snapshot: controller.snapshot,
    });
    viewportPorts.set(paneId, port);
    return port;
  }

  return Object.freeze({
    candidate(workspace, cursorEpochMs) {
      const value = requireCompatibleWorkspace(workspace);
      return createPaneWorkspace({
        activationGeneration,
        activePaneId: value.activePaneId,
        allowedInstrumentIds,
        instrumentSync: value.instrumentSync,
        panes: value.panes.map((pane) => ({
          instrumentId: pane.instrumentId,
          paneId: pane.paneId,
          timeframeId: pane.timeframeId,
          viewportIntent: moveViewportIntentCursor(pane.viewportIntent, cursorEpochMs),
        })),
        primaryInstrumentId,
        sessionId,
      });
    },
    capture() {
      return Object.freeze({
        accepted,
        viewports: Object.freeze([...viewports].map(([paneId, controller]) => Object.freeze({
          intent: controller.snapshot(), paneId,
        }))),
      });
    },
    accept(workspace, cursorEpochMs) {
      const value = requireCompatibleWorkspace(workspace);
      for (const pane of value.panes) viewport(pane.paneId).moveCursor(cursorEpochMs);
      accepted = rebuild(workspace);
      return accepted;
    },
    activePaneId: () => readPaneWorkspace(accepted).activePaneId,
    current: () => accepted,
    desiredInstrument(instrumentId, synchronize = false) {
      const workspace = setPaneInstrumentSync({
        instrumentSync: synchronize ? 'all' : 'pane',
        workspace: accepted,
      });
      return changePaneInstrument({
        instrumentId,
        paneId: readPaneWorkspace(workspace).activePaneId,
        workspace,
      });
    },
    desiredPaneCount(count, cursorEpochMs) {
      return rebuild(accepted, (current) => {
        if (!Number.isInteger(count) || count < 1 || count > paneIds.length) {
          failWorkspaceState(
            'WORKSPACE_STATE_PANE_COUNT_INVALID',
            'Pane count must fit the configured stable Pane identities.',
          );
        }
        const activePane = current.panes.find(({ paneId }) => paneId === current.activePaneId);
        const panesById = new Map(current.panes.map((pane) => [pane.paneId, pane]));
        const panes = paneIds.slice(0, count).map((paneId) => {
          const retained = panesById.get(paneId);
          if (retained) return retained;
          viewport(paneId, cursorEpochMs).moveCursor(cursorEpochMs);
          return {
            instrumentId: activePane.instrumentId,
            paneId,
            timeframeId: activePane.timeframeId,
          };
        });
        return {
          ...current,
          activePaneId: panes.some(({ paneId }) => paneId === current.activePaneId)
            ? current.activePaneId : primaryPaneId,
          panes,
        };
      });
    },
    desiredTimeframe(timeframeId, synchronize = false) {
      return changePaneTimeframe({
        paneId: readPaneWorkspace(accepted).activePaneId,
        synchronize,
        timeframeId,
        workspace: accepted,
      });
    },
    dispose() {
      viewportPorts.clear();
      viewports.clear();
    },
    focus(paneId) {
      const next = focusPane({ paneId, workspace: accepted });
      if (next === accepted) return false;
      accepted = next;
      return true;
    },
    paneIds(workspace = accepted) {
      return readPaneWorkspace(workspace).panes.map(({ paneId }) => paneId);
    },
    readDefaultRightMarginBars: () => defaultRightMarginBars,
    setDefaultRightMarginBars(value) {
      if (!Number.isSafeInteger(value) || value < 0) {
        failWorkspaceState(
          'WORKSPACE_STATE_DEFAULT_MARGIN_INVALID',
          'Default right margin must be a non-negative integer.',
        );
      }
      defaultRightMarginBars = value;
      for (const controller of viewports.values()) controller.setDefaultLatestOffsetBars(value);
    },
    replace(workspace) {
      const value = requireCompatibleWorkspace(workspace);
      for (const pane of value.panes) viewport(pane.paneId).replace(pane.viewportIntent);
      accepted = workspace;
      return accepted;
    },
    restore(state) {
      const retainedPaneIds = new Set(state.viewports.map(({ paneId }) => paneId));
      for (const paneId of viewports.keys()) {
        if (retainedPaneIds.has(paneId)) continue;
        viewports.delete(paneId);
        viewportPorts.delete(paneId);
      }
      for (const entry of state.viewports) viewport(entry.paneId).replace(entry.intent);
      accepted = state.accepted;
      return accepted;
    },
    viewportPort,
    wallOrigin(paneId) { return readViewportIntent(viewport(paneId).snapshot()).origin; },
  });
}
