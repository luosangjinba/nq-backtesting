/**
 * Session identity public contract.
 *
 * Owner: Session Store boundary.
 * Purpose: represent a durable Session key without allowing ordinary strings
 * to pass through Session-scoped APIs accidentally.
 * Inputs: exact opaque token strings or the versioned serialized form.
 * Outputs: frozen branded SessionId values and frozen serialized records.
 * Side effects: none; this module owns no registry, active Session, or storage.
 * Errors: SessionIdentityError with a stable code for invalid input.
 */

const SERIALIZATION_SCHEMA = 'v7.session-id';
const SERIALIZATION_VERSION = 1;
const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

class SessionIdValue {
  #token;

  constructor(token) {
    this.#token = token;
    Object.freeze(this);
  }

  token() {
    return this.#token;
  }
}

/**
 * Owner: Session Store boundary.
 * Purpose: expose stable validation failures without leaking implementation
 * details into consumers.
 * Inputs: stable error code and explanatory message.
 * Outputs: Error instance named `SessionIdentityError`.
 * Side effects: captures the normal JavaScript error stack only.
 * Errors: none.
 */
export class SessionIdentityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SessionIdentityError';
    this.code = code;
  }
}

function requireValidToken(token) {
  if (typeof token !== 'string') {
    throw new SessionIdentityError('SESSION_ID_TOKEN_TYPE', 'SessionId token must be a string.');
  }
  if (!TOKEN_PATTERN.test(token)) {
    throw new SessionIdentityError(
      'SESSION_ID_TOKEN_FORMAT',
      'SessionId token must be 1-128 opaque identifier characters without surrounding whitespace.',
    );
  }
  return token;
}

function readToken(candidate) {
  if (!(candidate instanceof SessionIdValue)) {
    throw new SessionIdentityError(
      'SESSION_ID_REQUIRED',
      'A branded SessionId is required; raw strings and structural lookalikes are rejected.',
    );
  }
  try {
    return candidate.token();
  } catch {
    throw new SessionIdentityError('SESSION_ID_REQUIRED', 'A valid branded SessionId is required.');
  }
}

/**
 * Owner: Session Store boundary.
 * Purpose: create a branded SessionId from an already-generated opaque token.
 * Inputs: exact token string; no coercion or trimming is performed.
 * Outputs: frozen SessionId value.
 * Side effects: none.
 * Errors: SESSION_ID_TOKEN_TYPE or SESSION_ID_TOKEN_FORMAT.
 *
 * Protected invariant — session-identity: ordinary strings must never satisfy a
 * Session-scoped contract. V6 repeatedly normalized raw ids at each consumer,
 * which made omitted, forged, and cross-Session identities indistinguishable.
 */
export function createSessionId(token) {
  return new SessionIdValue(requireValidToken(token));
}

/**
 * Owner: Session Store boundary.
 * Purpose: fail fast at every public Session-scoped API boundary.
 * Inputs: unknown candidate value.
 * Outputs: the same branded SessionId for fluent validation.
 * Side effects: none.
 * Errors: SESSION_ID_REQUIRED.
 */
export function requireSessionId(candidate) {
  readToken(candidate);
  return candidate;
}

/**
 * Owner: Session Store boundary.
 * Purpose: compare two validated Session identities by their opaque token.
 * Inputs: two branded SessionId values.
 * Outputs: boolean identity equality.
 * Side effects: none.
 * Errors: SESSION_ID_REQUIRED when either input is unbranded or forged.
 */
export function sessionIdsEqual(left, right) {
  return readToken(left) === readToken(right);
}

/**
 * Owner: Session Store boundary.
 * Purpose: cross a persistence or transport boundary using an explicit schema.
 * Inputs: branded SessionId.
 * Outputs: frozen JSON-compatible `{ schema, version, value }` record.
 * Side effects: none.
 * Errors: SESSION_ID_REQUIRED.
 */
export function serializeSessionId(sessionId) {
  return Object.freeze({
    schema: SERIALIZATION_SCHEMA,
    version: SERIALIZATION_VERSION,
    value: readToken(sessionId),
  });
}

/**
 * Owner: Session Store boundary.
 * Purpose: validate and restore the sole supported SessionId wire format.
 * Inputs: exact `{ schema, version, value }` record.
 * Outputs: new frozen SessionId value.
 * Side effects: none.
 * Errors: SESSION_ID_SERIALIZED_SHAPE, SESSION_ID_SCHEMA,
 * SESSION_ID_VERSION, SESSION_ID_TOKEN_TYPE, or SESSION_ID_TOKEN_FORMAT.
 */
export function deserializeSessionId(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new SessionIdentityError('SESSION_ID_SERIALIZED_SHAPE', 'Serialized SessionId must be an object.');
  }
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== 'schema,value,version') {
    throw new SessionIdentityError(
      'SESSION_ID_SERIALIZED_SHAPE',
      'Serialized SessionId must contain only schema, version, and value.',
    );
  }
  if (record.schema !== SERIALIZATION_SCHEMA) {
    throw new SessionIdentityError('SESSION_ID_SCHEMA', 'Unsupported SessionId schema.');
  }
  if (record.version !== SERIALIZATION_VERSION) {
    throw new SessionIdentityError('SESSION_ID_VERSION', 'Unsupported SessionId version.');
  }
  return createSessionId(record.value);
}
