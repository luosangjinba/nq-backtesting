import {
  createLayoutSync,
  readLayoutSync,
  setLayoutSync,
} from '../layout-sync-domain/public.js';

/**
 * Own the Replay Workspace UI projection of one accepted Layout Sync policy.
 * Persistence remains Session Store-owned and chart behavior remains adapter-owned.
 */
export function createLayoutSyncController({ adapter, initialLayoutSync, persist, view }) {
  let value = initialLayoutSync ?? createLayoutSync();
  readLayoutSync(value);

  function project(candidate) {
    const settings = readLayoutSync(candidate);
    adapter.setCrosshairSync(settings.crosshair);
    adapter.setTimeSync(settings.time);
    view.setLayoutSync(candidate);
  }

  project(value);

  return Object.freeze({
    change(key, enabled) {
      const previous = value;
      const next = setLayoutSync(previous, key, enabled);
      if (next === previous) return true;
      try {
        persist?.(next);
        value = next;
        project(next);
        return true;
      } catch {
        project(previous);
        view.setState('error', { message: 'Layout synchronization could not be saved locally.' });
        return false;
      }
    },
    read: () => readLayoutSync(value),
    snapshot: () => value,
  });
}
