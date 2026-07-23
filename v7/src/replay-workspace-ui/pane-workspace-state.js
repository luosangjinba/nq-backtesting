import {
  changePaneInstrument,
  changePaneTimeframe,
  createPaneWorkspace,
  focusPane,
  readPaneWorkspace,
  setPaneInstrumentSync,
} from '../pane-workspace-domain/public.js';
import {
  createInitialViewportIntent,
  createViewportController,
  readViewportIntent,
  restoreViewportIntent,
} from '../viewport-runtime/public.js';
import { readWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';
import { WORKSPACE_PANE_IDS } from './pane-identity.js';

const PANE_MAIN = WORKSPACE_PANE_IDS[0];

/** Own the UI composition's accepted Pane Workspace and Pane viewport controllers. */
export function createPaneWorkspaceState({
  initialCursorEpochMs,
  initialCheckpoint = null,
  initialPaneCount = 1,
  initialRightMarginBars = 12,
  initialTarget,
  record,
}) {
  const viewports = new Map();
  let accepted = null;
  let defaultRightMarginBars = initialRightMarginBars;
  const restored = initialCheckpoint === null ? null : readWorkspaceCheckpoint(initialCheckpoint);
  if (restored && restored.cursorEpochMs !== initialCursorEpochMs) {
    throw new TypeError('Restored Pane Workspace cursor must match the Replay checkpoint cursor.');
  }
  if (restored && restored.panes.length !== initialPaneCount) {
    throw new TypeError('Restored Pane Workspace must match its Pane Layout count.');
  }
  if (restored && restored.panes.some(
    ({ paneId }, index) => paneId !== WORKSPACE_PANE_IDS[index],
  )) {
    throw new TypeError('Restored Pane Workspace must use the stable P1-P4 priority prefix.');
  }
  const restoredPanes = new Map(restored?.panes.map((pane) => [pane.paneId, pane]) ?? []);

  function viewport(paneId, cursorEpochMs = initialCursorEpochMs) {
    if (!viewports.has(paneId)) {
      const saved = restoredPanes.get(paneId)?.viewport ?? null;
      viewports.set(paneId, createViewportController({
        defaultLatestOffsetBars: defaultRightMarginBars,
        defaultSpanBars: 80,
        initialIntent: saved === null
          ? createInitialViewportIntent({
            activationGeneration: record.activationGeneration,
            cursorEpochMs,
            latestOffsetBars: defaultRightMarginBars,
            paneId,
            sessionId: record.sessionId,
          })
          : restoreViewportIntent({
            activationGeneration: record.activationGeneration,
            cursorEpochMs,
            latestOffsetBars: saved.latestOffsetBars,
            origin: saved.origin,
            paneId,
            sessionId: record.sessionId,
            spanBars: saved.spanBars,
          }),
      }));
    }
    return viewports.get(paneId);
  }

  function build({ activePaneId, instrumentSync = 'pane', panes }) {
    return createPaneWorkspace({
      activationGeneration: record.activationGeneration,
      activePaneId,
      allowedInstrumentIds: record.configuration.instrumentIds,
      instrumentSync,
      panes: panes.map((pane) => ({
        instrumentId: pane.instrumentId,
        paneId: pane.paneId,
        timeframeId: pane.timeframeId,
        viewportIntent: viewport(pane.paneId).snapshot(),
      })),
      primaryInstrumentId: record.configuration.instrumentIds[0],
      sessionId: record.sessionId,
    });
  }

  function rebuild(workspace, transform) {
    const current = readPaneWorkspace(workspace);
    const next = transform(current);
    return build({
      activePaneId: next.activePaneId,
      instrumentSync: next.instrumentSync,
      panes: next.panes,
    });
  }

  accepted = build(restored === null
    ? {
      activePaneId: PANE_MAIN,
      panes: WORKSPACE_PANE_IDS.slice(0, initialPaneCount).map((paneId) => ({
        instrumentId: initialTarget.instrumentId,
        paneId,
        timeframeId: initialTarget.timeframeId,
      })),
    }
    : {
      activePaneId: restored.activePaneId,
      panes: restored.panes,
    });

  return Object.freeze({
    accept(workspace, cursorEpochMs) {
      const value = readPaneWorkspace(workspace);
      for (const pane of value.panes) viewport(pane.paneId).moveCursor(cursorEpochMs);
      accepted = rebuild(workspace, (current) => current);
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
        if (!Number.isInteger(count) || count < 1 || count > WORKSPACE_PANE_IDS.length) {
          throw new TypeError('Pane count must be an integer from one through four.');
        }
        const activePane = current.panes.find(({ paneId }) => paneId === current.activePaneId);
        const panesById = new Map(current.panes.map((pane) => [pane.paneId, pane]));
        const panes = WORKSPACE_PANE_IDS.slice(0, count).map((paneId) => {
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
            ? current.activePaneId : PANE_MAIN,
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
    dispose() { viewports.clear(); },
    focus(paneId) {
      accepted = focusPane({ paneId, workspace: accepted });
      return accepted;
    },
    paneIds(workspace = accepted) {
      return readPaneWorkspace(workspace).panes.map(({ paneId }) => paneId);
    },
    read: (workspace = accepted) => readPaneWorkspace(workspace),
    readDefaultRightMarginBars: () => defaultRightMarginBars,
    setDefaultRightMarginBars(value) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError('Default right margin must be a non-negative integer.');
      }
      defaultRightMarginBars = value;
      for (const controller of viewports.values()) controller.setDefaultLatestOffsetBars(value);
    },
    viewportPort: (paneId) => viewport(paneId),
    wallOrigin(paneId) { return readViewportIntent(viewport(paneId).snapshot()).origin; },
  });
}
