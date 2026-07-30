import { serializeLayoutSync } from '../layout-sync-domain/public.js';
import { serializePaneLayout } from '../pane-layout-domain/public.js';
import { serializeWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';

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
  workspaceState,
  persist,
  readLayout,
  readLayoutSync,
  view,
}) {
  let persistedKey = initialCheckpoint === null ? null : persistenceKey({
    checkpoint: initialCheckpoint,
    layout: initialLayout,
    layoutSync: initialLayoutSync,
  });

  function capture() { return workspaceState.checkpoint(); }

  function save({
    layout = readLayout(),
    layoutSync = readLayoutSync(),
    message = 'Workspace changes could not be saved locally.',
    rethrow = false,
  } = {}) {
    const checkpoint = capture();
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
