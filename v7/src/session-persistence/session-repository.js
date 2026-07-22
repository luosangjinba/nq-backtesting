import {
  deserializeSessionId,
  requireSessionId,
  serializeSessionId,
} from '../session-identity/public.js';
import { SessionPersistenceError } from './storage-adapter.js';

const INDEX_SCHEMA = 'v7.session-repository-index';
const ENTRY_SCHEMA = 'v7.session-repository-entry';
const SCHEMA_VERSION = 1;

function fail(code, message, options) {
  throw new SessionPersistenceError(code, message, options);
}

function parseJson(source, code) {
  try {
    return JSON.parse(source);
  } catch (cause) {
    fail(code, 'Persisted Session JSON is malformed.', { cause });
  }
}

function clone(value) {
  return parseJson(JSON.stringify(value), 'SESSION_VALUE_NOT_SERIALIZABLE');
}

function requireRevision(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail('INVALID_SESSION_REVISION', 'Session revision must be a positive safe integer.');
  }
  return value;
}

/**
 * Owner: session-store.
 * Purpose: create an explicit-key repository; it deliberately has no active
 * Session key, last-opened Session, module-global cache, or implicit fallback.
 * Inputs: storage adapter and an optional isolated namespace.
 * Outputs: frozen insert/read/list/compare-and-swap repository port.
 * Side effects: persists versioned index and record envelopes in supplied storage.
 * Errors: SessionPersistenceError for corrupt data, duplicate ids, or CAS conflict.
 *
 * Protected invariant — session-identity: every record key is derived from a
 * validated branded SessionId. V6's shared keys allowed A/B state to cross.
 */
export function createSessionRepository({ storage, namespace = 'v7.session-store' }) {
  if (!storage || typeof storage.read !== 'function'
    || typeof storage.write !== 'function' || typeof storage.remove !== 'function') {
    fail('INVALID_STORAGE_ADAPTER', 'Repository requires the explicit storage adapter port.');
  }
  if (typeof namespace !== 'string' || namespace.length === 0) {
    fail('INVALID_REPOSITORY_NAMESPACE', 'Repository namespace must be non-empty.');
  }
  const indexKey = `${namespace}:index`;
  const recordKey = (sessionId) => `${namespace}:record:${encodeURIComponent(serializeSessionId(sessionId).value)}`;

  function readIndex() {
    const raw = storage.read(indexKey);
    if (raw === null) return [];
    const index = parseJson(raw, 'CORRUPT_SESSION_INDEX');
    if (index?.schema !== INDEX_SCHEMA || index.version !== SCHEMA_VERSION
      || !Array.isArray(index.sessionIds)) {
      fail('UNSUPPORTED_SESSION_INDEX', 'Session index schema is unsupported.');
    }
    const ids = index.sessionIds.map(deserializeSessionId);
    const tokens = ids.map((sessionId) => serializeSessionId(sessionId).value);
    if (new Set(tokens).size !== tokens.length) {
      fail('DUPLICATE_SESSION_INDEX_ID', 'Session index contains a duplicate identity.');
    }
    return ids;
  }

  function writeIndex(sessionIds) {
    storage.write(indexKey, JSON.stringify({
      schema: INDEX_SCHEMA,
      version: SCHEMA_VERSION,
      sessionIds: sessionIds.map(serializeSessionId),
    }));
  }

  function readEntry(sessionId) {
    requireSessionId(sessionId);
    const raw = storage.read(recordKey(sessionId));
    if (raw === null) return null;
    const entry = parseJson(raw, 'CORRUPT_SESSION_ENTRY');
    if (entry?.schema !== ENTRY_SCHEMA || entry.version !== SCHEMA_VERSION
      || !Object.hasOwn(entry, 'value')) {
      fail('UNSUPPORTED_SESSION_ENTRY', 'Session entry schema is unsupported.');
    }
    requireRevision(entry.revision);
    return entry;
  }

  function writeEntry(sessionId, revision, value) {
    storage.write(recordKey(sessionId), JSON.stringify({
      schema: ENTRY_SCHEMA,
      version: SCHEMA_VERSION,
      revision: requireRevision(revision),
      value: clone(value),
    }));
  }

  return Object.freeze({
    insert(sessionId, value) {
      requireSessionId(sessionId);
      if (readEntry(sessionId) !== null) fail('SESSION_ALREADY_EXISTS', 'Session already exists.');
      const ids = readIndex();
      writeEntry(sessionId, 1, value);
      try {
        writeIndex([...ids, sessionId]);
      } catch (error) {
        storage.remove(recordKey(sessionId));
        throw error;
      }
      return Object.freeze({ revision: 1, value: clone(value) });
    },
    read(sessionId) {
      const entry = readEntry(sessionId);
      return entry === null ? null : Object.freeze({ revision: entry.revision, value: clone(entry.value) });
    },
    listSessionIds() {
      return Object.freeze([...readIndex()]);
    },
    compareAndSwap(sessionId, expectedRevision, nextValue) {
      requireRevision(expectedRevision);
      const current = readEntry(sessionId);
      if (current === null) fail('SESSION_NOT_FOUND', 'Session does not exist.');
      if (current.revision !== expectedRevision) {
        fail('SESSION_REVISION_CONFLICT', 'Session changed before compare-and-swap commit.');
      }
      const revision = expectedRevision + 1;
      requireRevision(revision);
      writeEntry(sessionId, revision, nextValue);
      return Object.freeze({ revision, value: clone(nextValue) });
    },
    remove(sessionId, expectedRevision) {
      requireSessionId(sessionId);
      requireRevision(expectedRevision);
      const current = readEntry(sessionId);
      if (current === null) fail('SESSION_NOT_FOUND', 'Session does not exist.');
      if (current.revision !== expectedRevision) {
        fail('SESSION_REVISION_CONFLICT', 'Session changed before remove commit.');
      }
      const ids = readIndex();
      const retained = ids.filter((id) => serializeSessionId(id).value !== serializeSessionId(sessionId).value);
      if (retained.length === ids.length) {
        fail('SESSION_INDEX_ID_MISSING', 'Session record is absent from the Session index.');
      }
      writeIndex(retained);
      try {
        storage.remove(recordKey(sessionId));
      } catch (error) {
        try {
          writeIndex(ids);
        } catch (rollbackCause) {
          fail('SESSION_REMOVE_ROLLBACK_FAILED', 'Session removal could not restore its index.', {
            cause: new AggregateError([error, rollbackCause]),
          });
        }
        throw error;
      }
      return Object.freeze({ revision: current.revision, value: clone(current.value) });
    },
  });
}
