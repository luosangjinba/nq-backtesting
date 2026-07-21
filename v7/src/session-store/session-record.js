import {
  deserializeActivationGeneration,
  requireActivationGeneration,
  serializeActivationGeneration,
} from '../activation-generation/public.js';
import {
  deserializeSessionId,
  requireSessionId,
  serializeSessionId,
} from '../session-identity/public.js';
import { deserializePaneLayout, serializePaneLayout } from '../pane-layout-domain/public.js';

const RECORD_SCHEMA = 'v7.session-record';
const RECORD_VERSION = 1;

/** Stable error for invalid Session records and Session Store operations. */
export class SessionStoreError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'SessionStoreError';
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new SessionStoreError(code, message, options);
}

function requireEpoch(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('INVALID_SESSION_TIMESTAMP', `${field} must be a non-negative safe integer.`);
  }
  return value;
}

function requireName(value) {
  if (typeof value !== 'string' || value.trim() !== value || value.length < 1 || value.length > 120) {
    fail('INVALID_SESSION_NAME', 'Session name must be 1-120 exact characters without outer whitespace.');
  }
  return value;
}

function requireConfiguration(value) {
  const start = requireEpoch(value?.historicalRange?.startEpochMs, 'historicalRange.startEpochMs');
  const end = requireEpoch(value?.historicalRange?.endEpochMs, 'historicalRange.endEpochMs');
  if (end <= start) fail('INVALID_SESSION_RANGE', 'Historical range end must be later than start.');
  if (!Array.isArray(value?.instrumentIds) || value.instrumentIds.length === 0
    || value.instrumentIds.some((id) => typeof id !== 'string' || id.length === 0)
    || new Set(value.instrumentIds).size !== value.instrumentIds.length) {
    fail('INVALID_SESSION_INSTRUMENTS', 'Session instruments must be unique non-empty capability ids.');
  }
  return Object.freeze({
    historicalRange: Object.freeze({ startEpochMs: start, endEpochMs: end }),
    instrumentIds: Object.freeze([...value.instrumentIds]),
  });
}

function requireWorkspace(value = { schemaVersion: 1, state: 'uninitialized' }) {
  if (value?.schemaVersion === 1 && value.state === 'uninitialized'
    && Object.keys(value).sort().join(',') === 'schemaVersion,state') {
    return Object.freeze({ schemaVersion: 1, state: 'uninitialized' });
  }
  if (value?.schemaVersion === 2 && value.state === 'configured'
    && Object.keys(value).sort().join(',') === 'paneLayout,schemaVersion,state') {
    try {
      return Object.freeze({
        paneLayout: serializePaneLayout(deserializePaneLayout(value.paneLayout)),
        schemaVersion: 2,
        state: 'configured',
      });
    } catch (cause) {
      fail('INVALID_SESSION_WORKSPACE', 'Session workspace Pane layout is invalid.', { cause });
    }
  }
  fail('INVALID_SESSION_WORKSPACE', 'Session workspace envelope is unsupported.');
}

function freezeRecord(value) {
  requireSessionId(value.sessionId);
  if (value.activationGeneration !== null && value.activationGeneration !== undefined) {
    requireActivationGeneration(value.activationGeneration);
  }
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) {
    fail('INVALID_SESSION_REVISION', 'Session revision must be a positive safe integer.');
  }
  const createdAtEpochMs = requireEpoch(value.metadata?.createdAtEpochMs, 'metadata.createdAtEpochMs');
  const updatedAtEpochMs = requireEpoch(value.metadata?.updatedAtEpochMs, 'metadata.updatedAtEpochMs');
  if (updatedAtEpochMs < createdAtEpochMs) {
    fail('INVALID_SESSION_TIMESTAMP_ORDER', 'Session update time cannot precede creation time.');
  }
  return Object.freeze({
    sessionId: value.sessionId,
    revision: value.revision,
    activationGeneration: value.activationGeneration ?? null,
    metadata: Object.freeze({
      name: requireName(value.metadata?.name),
      createdAtEpochMs,
      updatedAtEpochMs,
    }),
    configuration: requireConfiguration(value.configuration),
    workspace: requireWorkspace(value.workspace),
  });
}

/**
 * Owner: session-store.
 * Purpose: construct the only R2.1 durable Session record without bars, Replay,
 * pane state, viewport state, or an implicit active Session.
 * Inputs: branded SessionId, exact metadata, historical range, and instruments.
 * Outputs: deeply frozen revision-one Session record.
 * Side effects: none.
 * Errors: SessionStoreError or SessionIdentityError for invalid fields.
 */
export function createSessionRecord({ sessionId, name, historicalRange, instrumentIds, nowEpochMs }) {
  return freezeRecord({
    sessionId,
    revision: 1,
    activationGeneration: null,
    metadata: { name, createdAtEpochMs: nowEpochMs, updatedAtEpochMs: nowEpochMs },
    configuration: { historicalRange, instrumentIds },
    workspace: { schemaVersion: 1, state: 'uninitialized' },
  });
}

/**
 * Owner: session-store.
 * Purpose: serialize a Session record through one versioned persistence schema.
 * Inputs: valid frozen or structural Session record.
 * Outputs: frozen JSON-compatible wire record.
 * Side effects: none.
 * Errors: SessionStoreError or identity contract errors.
 */
export function serializeSessionRecord(record) {
  const value = freezeRecord(record);
  return Object.freeze({
    schema: RECORD_SCHEMA,
    version: RECORD_VERSION,
    sessionId: serializeSessionId(value.sessionId),
    revision: value.revision,
    activationGeneration: value.activationGeneration === null
      ? null : serializeActivationGeneration(value.activationGeneration),
    metadata: value.metadata,
    configuration: value.configuration,
    workspace: value.workspace,
  });
}

function migrate(record, migrations) {
  let current = record;
  const seen = new Set();
  while (current?.schema === RECORD_SCHEMA && current.version !== RECORD_VERSION) {
    if (!Number.isSafeInteger(current.version) || current.version < 0 || seen.has(current.version)) {
      fail('INVALID_SESSION_MIGRATION', 'Session record migration chain is invalid.');
    }
    seen.add(current.version);
    const migration = migrations?.[current.version];
    if (typeof migration !== 'function') {
      fail('UNSUPPORTED_SESSION_RECORD_VERSION', `No migration exists for Session record v${current.version}.`);
    }
    current = migration(current);
  }
  return current;
}

/**
 * Owner: session-store.
 * Purpose: restore and deliberately migrate a persisted Session record.
 * Inputs: wire record and optional map keyed by source schema version.
 * Outputs: deeply frozen current Session record.
 * Side effects: invokes only explicitly supplied migration functions.
 * Errors: unsupported schema/version, invalid migration, or invalid record data.
 */
export function deserializeSessionRecord(record, { migrations = {} } = {}) {
  const current = migrate(record, migrations);
  if (current?.schema !== RECORD_SCHEMA) fail('UNSUPPORTED_SESSION_RECORD_SCHEMA', 'Session record schema is unsupported.');
  if (current.version !== RECORD_VERSION) fail('UNSUPPORTED_SESSION_RECORD_VERSION', 'Session record version is unsupported.');
  return freezeRecord({
    sessionId: deserializeSessionId(current.sessionId),
    revision: current.revision,
    activationGeneration: current.activationGeneration === null
      ? null : deserializeActivationGeneration(current.activationGeneration),
    metadata: current.metadata,
    configuration: current.configuration,
    workspace: current.workspace,
  });
}

export const SESSION_RECORD_INTERNALS = Object.freeze({ freezeRecord });
