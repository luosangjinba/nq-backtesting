import { serializeLayoutSync } from '../layout-sync-domain/public.js';
import { serializePaneLayout } from '../pane-layout-domain/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import {
  createWorkspaceCheckpoint,
  serializeWorkspaceCheckpoint,
} from '../workspace-checkpoint-domain/public.js';

function persistenceKey({ checkpoint, layout, layoutSync }) {
  return JSON.stringify({
    checkpoint: serializeWorkspaceCheckpoint(checkpoint),
    layout: serializePaneLayout(layout),
    layoutSync: serializeLayoutSync(layoutSync),
  });
}

/** Own semantic checkpoint capture, equality suppression, and persistence feedback. */
export function createWorkspaceCheckpointPersistence({
  initialCheckpoint = null,
  initialLayout,
  initialLayoutSync,
  paneState,
  persist,
  readCursorEpochMs,
  readLayout,
  readLayoutSync,
  readSessionHoursMode,
  record,
  view,
}) {
  let persistedKey = initialCheckpoint === null ? null : persistenceKey({
    checkpoint: initialCheckpoint,
    layout: initialLayout,
    layoutSync: initialLayoutSync,
  });

  function capture(sessionHoursMode = readSessionHoursMode()) {
    const workspace = paneState.read();
    return createWorkspaceCheckpoint({
      activePaneId: workspace.activePaneId,
      cursorEpochMs: readCursorEpochMs(),
      panes: workspace.panes.map((pane) => {
        const viewport = readViewportIntent(paneState.viewportPort(pane.paneId).snapshot());
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
      sessionHoursMode,
    }, record.configuration);
  }

  function save({
    layout = readLayout(),
    layoutSync = readLayoutSync(),
    message = 'Workspace changes could not be saved locally.',
    rethrow = false,
    sessionHoursMode,
  } = {}) {
    const checkpoint = capture(sessionHoursMode);
    const key = persistenceKey({ checkpoint, layout, layoutSync });
    if (key === persistedKey) return true;
    try {
      persist?.({ checkpoint, layout, layoutSync });
      persistedKey = key;
      return true;
    } catch (error) {
      if (rethrow) throw error;
      view.setState('error', { message });
      return false;
    }
  }

  return Object.freeze({ capture, save });
}
