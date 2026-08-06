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
  let reversibleWrite = null;

  function capture() { return workspaceState.checkpoint(); }

  function requireReversibleWrite(value) {
    if (!value || typeof value.finalize !== 'function'
      || typeof value.rollback !== 'function' || typeof value.snapshot !== 'function') {
      throw new TypeError('Reversible Workspace persistence requires a durable write receipt.');
    }
    return value;
  }

  function persistExact({ checkpoint, layout, layoutSync }, { reversible = false } = {}) {
    if (reversibleWrite !== null) {
      throw new TypeError('A reversible Workspace persistence write is already pending.');
    }
    const key = persistenceKey({ checkpoint, layout, layoutSync });
    const previousKey = persistedKey;
    const result = persist?.({ checkpoint, layout, layoutSync, reversible });
    if (reversible && persist) {
      let receipt;
      try {
        receipt = requireReversibleWrite(result);
      } catch (error) {
        const failures = [error];
        try { result?.rollback?.(); } catch (rollbackError) { failures.push(rollbackError); }
        throw failures.length === 1
          ? error
          : new AggregateError(failures, 'Invalid Workspace persistence receipt could not roll back.');
      }
      reversibleWrite = Object.freeze({ candidateKey: key, previousKey, receipt });
    }
    persistedKey = key;
    return true;
  }

  function save({
    layout = readLayout(),
    layoutSync = readLayoutSync(),
    message = 'Workspace changes could not be saved locally.',
    rethrow = false,
    reversible = false,
  } = {}) {
    const checkpoint = capture();
    const key = persistenceKey({ checkpoint, layout, layoutSync });
    if (key === persistedKey) return true;
    try {
      return persistExact({ checkpoint, layout, layoutSync }, { reversible });
    } catch (error) {
      if (rethrow) throw error;
      view.setState('error', { message });
      return false;
    }
  }

  /**
   * Restore one captured accepted checkpoint during transaction rollback.
   *
   * A synchronous persistence failure leaves `persistedKey` at the last
   * accepted value. A successful reversible write is compensated through its
   * Session Repository receipt, which restores the exact prior envelope bytes
   * instead of creating a new logical Session revision.
   */
  function restore({ checkpoint, layout, layoutSync }) {
    const key = persistenceKey({ checkpoint, layout, layoutSync });
    if (reversibleWrite === null) {
      // No successful reversible write crossed the persistence boundary. The
      // last accepted durable bytes are therefore already untouched, even
      // when an uninitialized Session has no semantic `persistedKey` yet.
      return true;
    }
    const pending = reversibleWrite;
    if (pending.previousKey !== key || pending.candidateKey !== persistedKey) {
      throw new TypeError('Workspace persistence rollback does not match its accepted checkpoint.');
    }
    pending.receipt.rollback();
    persistedKey = pending.previousKey;
    reversibleWrite = null;
    return true;
  }

  function finalize() {
    if (reversibleWrite === null) return true;
    reversibleWrite.receipt.finalize();
    reversibleWrite = null;
    return true;
  }

  return Object.freeze({ capture, finalize, restore, save });
}
