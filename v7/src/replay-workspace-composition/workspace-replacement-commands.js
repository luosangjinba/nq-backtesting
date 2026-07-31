import { readViewportIntent } from '../viewport-runtime/public.js';
import { planReplacementHistoryFill } from './history-fill-plan.js';

function replacementHistoryBars(pane) {
  return planReplacementHistoryFill(readViewportIntent(pane.viewportIntent)).displayBars;
}

/** Coordinate instrument, Session Hours, and timeframe replacement commands. */
export function createWorkspaceReplacementCommands({
  acceptedPaneWorkspace,
  execution,
  isDisposed,
  layoutSyncController,
  workspaceState,
}) {
  return Object.freeze({
    replaceInstrument(instrumentId) {
      if (isDisposed() || execution.isPending()) return;
      const current = workspaceState.read(acceptedPaneWorkspace());
      const desiredWorkspace = workspaceState.desiredInstrument(
        instrumentId,
        layoutSyncController.read().symbol,
      );
      const desired = workspaceState.read(desiredWorkspace);
      const requestKinds = new Map(desired.panes
        .filter((pane, index) => pane.instrumentId !== current.panes[index].instrumentId)
        .map(({ paneId }) => [paneId, { kind: 'instrument-replacement' }]));
      if (requestKinds.size === 0) return;
      return execution.materialize({ desiredWorkspace, requestKinds });
    },
    replaceSessionHours(mode) {
      if (isDisposed() || execution.isPending()) return;
      const requestKinds = new Map(workspaceState.read(acceptedPaneWorkspace()).panes.map((pane) => [pane.paneId, {
        historyDisplayBars: replacementHistoryBars(pane),
        kind: 'session-hours-replacement',
      }]));
      return execution.replaceSessionHours(mode, requestKinds);
    },
    replaceTimeframe(timeframeId) {
      if (isDisposed() || execution.isPending()) return;
      const current = workspaceState.read(acceptedPaneWorkspace());
      const desiredWorkspace = workspaceState.desiredTimeframe(
        timeframeId,
        layoutSyncController.read().interval,
      );
      const desired = workspaceState.read(desiredWorkspace);
      const changedPanes = desired.panes.filter(
        (pane, index) => pane.timeframeId !== current.panes[index].timeframeId,
      );
      if (changedPanes.length === 0) return;
      const requestKinds = new Map(changedPanes.map((pane) => [pane.paneId, {
        historyDisplayBars: replacementHistoryBars(pane),
        kind: 'timeframe-replacement',
      }]));
      return execution.materialize({ desiredWorkspace, requestKinds });
    },
  });
}
