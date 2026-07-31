import { readWorkspaceStateSnapshot } from '../workspace-state-runtime/public.js';

/** Coordinate Pane focus and non-transactional Layout Sync commands. */
export function createWorkspaceFocusSyncCommands({
  adapter,
  checkpointPersistence,
  execution,
  isDisposed,
  layoutSyncController,
  presentation,
  readSyncTimeframe,
  setReplayStep,
  setSyncTimeframe,
  syncReplayStep,
  workspaceState,
}) {
  return Object.freeze({
    changeLayoutSync(key, enabled) {
      if (isDisposed() || execution.isPending()) return false;
      return layoutSyncController.change(key, enabled);
    },
    changeReplayStep(replayStepId) {
      if (isDisposed() || execution.isPending() || readSyncTimeframe()) return;
      setReplayStep(replayStepId);
    },
    changeTimeframeSync(enabled) {
      if (isDisposed() || execution.isPending()) return;
      setSyncTimeframe(enabled === true);
      presentation.setTimeframeSync(readSyncTimeframe());
      if (readSyncTimeframe()) syncReplayStep();
    },
    focusPane(paneId) {
      if (isDisposed() || execution.isPending()) return;
      const previousPaneId = workspaceState.activePaneId();
      const focused = readWorkspaceStateSnapshot(workspaceState.focus(paneId));
      presentation.setWorkspace(focused.paneWorkspace);
      presentation.setWall(paneId, workspaceState.wallOrigin(paneId));
      syncReplayStep();
      if (!checkpointPersistence.save({ message: 'Active Pane could not be saved locally.' })) {
        const restoredState = readWorkspaceStateSnapshot(workspaceState.focus(previousPaneId));
        presentation.setWorkspace(restoredState.paneWorkspace);
        presentation.setWall(previousPaneId, workspaceState.wallOrigin(previousPaneId));
        syncReplayStep();
      }
    },
    resetView(paneId = null) {
      adapter.resetView(paneId ?? workspaceState.activePaneId());
    },
  });
}
