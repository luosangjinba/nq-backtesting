import {
  changePaneInstrument,
  createPaneWorkspace,
  focusPane,
  readPaneWorkspace,
} from '../pane-workspace-domain/public.js';
import {
  createInitialViewportIntent,
  createViewportController,
  readViewportIntent,
} from '../viewport-runtime/public.js';

const PANE_MAIN = 'pane-main';
const PANE_SECONDARY = 'pane-secondary';

/** Own the UI composition's accepted Pane Workspace and Pane viewport controllers. */
export function createPaneWorkspaceState({ initialCursorEpochMs, initialTarget, record }) {
  const viewports = new Map();
  let accepted = null;

  function viewport(paneId, cursorEpochMs = initialCursorEpochMs) {
    if (!viewports.has(paneId)) {
      viewports.set(paneId, createViewportController({
        defaultSpanBars: 80,
        initialIntent: createInitialViewportIntent({
          activationGeneration: record.activationGeneration,
          cursorEpochMs,
          latestOffsetBars: 12,
          paneId,
          sessionId: record.sessionId,
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

  accepted = build({
    activePaneId: PANE_MAIN,
    panes: [{
      instrumentId: initialTarget.instrumentId,
      paneId: PANE_MAIN,
      timeframeId: initialTarget.timeframeId,
    }],
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
    desiredInstrument(instrumentId) {
      return changePaneInstrument({
        instrumentId,
        paneId: readPaneWorkspace(accepted).activePaneId,
        workspace: accepted,
      });
    },
    desiredPaneCount(count, cursorEpochMs) {
      return rebuild(accepted, (current) => {
        if (count === 1) return { ...current, activePaneId: PANE_MAIN, panes: [current.panes[0]] };
        const activePane = current.panes.find(({ paneId }) => paneId === current.activePaneId);
        viewport(PANE_SECONDARY, cursorEpochMs).moveCursor(cursorEpochMs);
        return {
          ...current,
          panes: [...current.panes, {
            instrumentId: activePane.instrumentId,
            paneId: PANE_SECONDARY,
            timeframeId: activePane.timeframeId,
          }],
        };
      });
    },
    desiredTimeframe(timeframeId) {
      return rebuild(accepted, (current) => ({
        ...current,
        panes: current.panes.map((pane) => pane.paneId === current.activePaneId
          ? { ...pane, timeframeId }
          : pane),
      }));
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
    viewportPort: (paneId) => viewport(paneId),
    wallOrigin(paneId) { return readViewportIntent(viewport(paneId).snapshot()).origin; },
  });
}
