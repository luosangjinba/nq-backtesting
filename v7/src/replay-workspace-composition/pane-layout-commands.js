import { createPaneLayout, readPaneLayout } from '../pane-layout-domain/public.js';

/** Coordinate Pane layout variant/count/ratio commands over existing owners. */
export function createPaneLayoutCommands({
  acceptedPaneWorkspace,
  checkpointPersistence,
  execution,
  isDisposed,
  presentation,
  readPaneLayoutValue,
  replay,
  setPaneLayoutValue,
  workspaceState,
}) {
  return Object.freeze({
    async changePaneLayout(variantId) {
      if (isDisposed() || execution.isPending()) return null;
      const previousLayout = readPaneLayoutValue();
      const previous = readPaneLayout(previousLayout);
      if (variantId === previous.variantId) return null;
      const desiredLayout = createPaneLayout({ variantId });
      const desired = readPaneLayout(desiredLayout);
      if (desired.paneCount === previous.paneCount) {
        setPaneLayoutValue(desiredLayout);
        presentation.setLayout(readPaneLayoutValue(), workspaceState.paneIds());
        if (!checkpointPersistence.save({
          layout: readPaneLayoutValue(),
          message: 'Pane layout could not be saved locally.',
        })) {
          setPaneLayoutValue(previousLayout);
          presentation.setLayout(readPaneLayoutValue(), workspaceState.paneIds());
        }
        return null;
      }
      const current = workspaceState.read(acceptedPaneWorkspace());
      const desiredWorkspace = workspaceState.desiredPaneCount(
        desired.paneCount,
        replay.snapshot().cursorEpochMs,
      );
      setPaneLayoutValue(desiredLayout);
      presentation.setLayout(readPaneLayoutValue(), workspaceState.paneIds(desiredWorkspace));
      const terminal = await execution.materialize({ desiredWorkspace });
      if (terminal === null) {
        setPaneLayoutValue(previousLayout);
        presentation.setLayout(readPaneLayoutValue(), current.panes.map(({ paneId }) => paneId));
      }
      return terminal;
    },
    resizePaneLayout(nextLayout) {
      if (isDisposed() || execution.isPending()) return;
      const current = readPaneLayout(readPaneLayoutValue());
      const next = readPaneLayout(nextLayout);
      if (current.variantId !== next.variantId || current.paneCount !== next.paneCount) return;
      const previousLayout = readPaneLayoutValue();
      setPaneLayoutValue(nextLayout);
      presentation.setLayout(readPaneLayoutValue(), workspaceState.paneIds());
      if (!checkpointPersistence.save({
        layout: readPaneLayoutValue(),
        message: 'Pane layout could not be saved locally.',
      })) {
        setPaneLayoutValue(previousLayout);
        presentation.setLayout(readPaneLayoutValue(), workspaceState.paneIds());
      }
    },
  });
}
