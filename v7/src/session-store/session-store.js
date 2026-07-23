import {
  createActivationGeneration,
  nextActivationGeneration,
} from '../activation-generation/public.js';
import { createPaneLayout, serializePaneLayout } from '../pane-layout-domain/public.js';
import {
  createLayoutSync,
  serializeLayoutSync,
} from '../layout-sync-domain/public.js';
import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import {
  createSessionRecord,
  deserializeSessionRecord,
  serializeSessionRecord,
  SESSION_RECORD_INTERNALS,
  SessionStoreError,
} from './session-record.js';

function fail(code, message) {
  throw new SessionStoreError(code, message);
}

function requireRepository(repository) {
  for (const method of ['insert', 'read', 'listSessionIds', 'compareAndSwap', 'remove']) {
    if (typeof repository?.[method] !== 'function') {
      fail('INVALID_SESSION_REPOSITORY', `Session repository must implement ${method}().`);
    }
  }
  return repository;
}

/**
 * Owner: session-store.
 * Purpose: own durable Session create/read/list/delete/activation behavior over
 * an injected repository; no module-global active Session is created.
 * Inputs: explicit repository port and optional version migration map.
 * Outputs: frozen Session Store API.
 * Side effects: writes only through the repository supplied to this instance.
 * Errors: SessionStoreError, identity errors, or persistence port errors.
 *
 * Protected invariant — stale-rejection: activation generation is advanced in
 * the same CAS commit as its Session revision, so reconstructed runtimes cannot
 * accidentally reuse an older activation identity.
 */
export function createSessionStore({ repository, migrations = {} }) {
  const port = requireRepository(repository);

  function configuredWorkspace(current, overrides = {}) {
    return {
      layoutSync: overrides.layoutSync
        ?? (current.workspace.state === 'configured' && current.workspace.schemaVersion >= 5
          ? current.workspace.layoutSync
          : serializeLayoutSync(createLayoutSync())),
      paneLayout: overrides.paneLayout
        ?? (current.workspace.state === 'configured'
          ? current.workspace.paneLayout
          : serializePaneLayout(createPaneLayout())),
      schemaVersion: 5,
      state: 'configured',
    };
  }

  function requireExisting(sessionId) {
    requireSessionId(sessionId);
    const persisted = port.read(sessionId);
    if (persisted === null) fail('SESSION_NOT_FOUND', 'Session does not exist.');
    const record = deserializeSessionRecord(persisted.value, { migrations });
    if (!sessionIdsEqual(record.sessionId, sessionId)) {
      fail('SESSION_RECORD_IDENTITY_MISMATCH', 'Persisted Session identity does not match its explicit key.');
    }
    if (record.revision !== persisted.revision) {
      fail('SESSION_REVISION_MISMATCH', 'Session record and repository revisions disagree.');
    }
    return record;
  }

  return Object.freeze({
    createSession(input) {
      const record = createSessionRecord(input);
      port.insert(record.sessionId, serializeSessionRecord(record));
      return record;
    },
    getSession(sessionId) {
      return requireExisting(sessionId);
    },
    listSessions() {
      return Object.freeze(port.listSessionIds().map(requireExisting));
    },
    deleteSession(sessionId) {
      const current = requireExisting(sessionId);
      port.remove(sessionId, current.revision);
      return current;
    },
    activateSession(sessionId, { nowEpochMs }) {
      const current = requireExisting(sessionId);
      const activationGeneration = current.activationGeneration === null
        ? createActivationGeneration(1)
        : nextActivationGeneration(current.activationGeneration);
      const next = SESSION_RECORD_INTERNALS.freezeRecord({
        ...current,
        revision: current.revision + 1,
        activationGeneration,
        metadata: { ...current.metadata, updatedAtEpochMs: nowEpochMs },
      });
      port.compareAndSwap(sessionId, current.revision, serializeSessionRecord(next));
      return next;
    },
    savePaneLayout(sessionId, { layout, nowEpochMs }) {
      const current = requireExisting(sessionId);
      const next = SESSION_RECORD_INTERNALS.freezeRecord({
        ...current,
        revision: current.revision + 1,
        metadata: { ...current.metadata, updatedAtEpochMs: nowEpochMs },
        workspace: configuredWorkspace(current, { paneLayout: serializePaneLayout(layout) }),
      });
      port.compareAndSwap(sessionId, current.revision, serializeSessionRecord(next));
      return next;
    },
    saveLayoutSync(sessionId, { layoutSync, nowEpochMs }) {
      const current = requireExisting(sessionId);
      const serialized = serializeLayoutSync(layoutSync);
      const next = SESSION_RECORD_INTERNALS.freezeRecord({
        ...current,
        revision: current.revision + 1,
        metadata: { ...current.metadata, updatedAtEpochMs: nowEpochMs },
        workspace: configuredWorkspace(current, { layoutSync: serialized }),
      });
      port.compareAndSwap(sessionId, current.revision, serializeSessionRecord(next));
      return next;
    },
  });
}
