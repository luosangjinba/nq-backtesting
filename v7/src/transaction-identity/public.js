/**
 * Owner: workspace-transaction-runtime.
 * Purpose: expose the complete supported public contract for transaction identity.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/**
 * Transaction identity public contract.
 *
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: identify one immutable transaction without exposing raw strings as
 * valid transaction-scoped values.
 * Inputs: exact opaque token strings or the supported versioned wire form.
 * Outputs: frozen branded TransactionId values.
 * Side effects: none; this module owns no counter, scheduler, or active work.
 * Errors: TransactionIdentityError with a stable code for invalid input.
 */

const SERIALIZATION_SCHEMA = 'v7.transaction-id';
const SERIALIZATION_VERSION = 1;
const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

class TransactionIdValue {
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
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: expose stable TransactionId validation failures.
 * Inputs: stable error code and explanatory message.
 * Outputs: Error instance named `TransactionIdentityError`.
 * Side effects: captures the normal JavaScript error stack only.
 * Errors: none.
 */
export class TransactionIdentityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TransactionIdentityError';
    this.code = code;
  }
}

function requireValidToken(token) {
  if (typeof token !== 'string') {
    throw new TransactionIdentityError(
      'TRANSACTION_ID_TOKEN_TYPE',
      'TransactionId token must be a string.',
    );
  }
  if (!TOKEN_PATTERN.test(token)) {
    throw new TransactionIdentityError(
      'TRANSACTION_ID_TOKEN_FORMAT',
      'TransactionId token must be 1-128 opaque identifier characters without whitespace.',
    );
  }
  return token;
}

function readToken(candidate) {
  if (!(candidate instanceof TransactionIdValue)) {
    throw new TransactionIdentityError(
      'TRANSACTION_ID_REQUIRED',
      'A branded TransactionId is required; raw strings and lookalikes are rejected.',
    );
  }
  try {
    return candidate.token();
  } catch {
    throw new TransactionIdentityError('TRANSACTION_ID_REQUIRED', 'A valid branded TransactionId is required.');
  }
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: create a branded TransactionId from an already-generated token.
 * Inputs: exact token string; no coercion or trimming is performed.
 * Outputs: frozen TransactionId.
 * Side effects: none; allocation belongs to the future transaction owner.
 * Errors: TRANSACTION_ID_TOKEN_TYPE or TRANSACTION_ID_TOKEN_FORMAT.
 *
 * Protected invariant — stale-rejection: transaction identity cannot be a
 * module-global counter like V6 chart replacement ids. Every completion must
 * carry an explicit identity allocated by the sole transaction owner.
 */
export function createTransactionId(token) {
  return new TransactionIdValue(requireValidToken(token));
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: fail fast at every future transaction-scoped public boundary.
 * Inputs: unknown candidate value.
 * Outputs: the same branded TransactionId.
 * Side effects: none.
 * Errors: TRANSACTION_ID_REQUIRED.
 */
export function requireTransactionId(candidate) {
  readToken(candidate);
  return candidate;
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: compare two validated transaction identities.
 * Inputs: two branded TransactionId values.
 * Outputs: boolean token equality.
 * Side effects: none.
 * Errors: TRANSACTION_ID_REQUIRED for either invalid input.
 */
export function transactionIdsEqual(left, right) {
  return readToken(left) === readToken(right);
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: cross a diagnostic or transport boundary with an explicit schema.
 * Inputs: branded TransactionId.
 * Outputs: frozen JSON-compatible `{ schema, version, value }` record.
 * Side effects: none.
 * Errors: TRANSACTION_ID_REQUIRED.
 */
export function serializeTransactionId(transactionId) {
  return Object.freeze({
    schema: SERIALIZATION_SCHEMA,
    version: SERIALIZATION_VERSION,
    value: readToken(transactionId),
  });
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: validate and restore the supported TransactionId wire form.
 * Inputs: exact `{ schema, version, value }` record.
 * Outputs: new frozen TransactionId.
 * Side effects: none.
 * Errors: TRANSACTION_ID_SERIALIZED_SHAPE, TRANSACTION_ID_SCHEMA,
 * TRANSACTION_ID_VERSION, or token validation errors.
 */
export function deserializeTransactionId(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TransactionIdentityError('TRANSACTION_ID_SERIALIZED_SHAPE', 'Serialized TransactionId must be an object.');
  }
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== 'schema,value,version') {
    throw new TransactionIdentityError(
      'TRANSACTION_ID_SERIALIZED_SHAPE',
      'Serialized TransactionId must contain only schema, version, and value.',
    );
  }
  if (record.schema !== SERIALIZATION_SCHEMA) {
    throw new TransactionIdentityError('TRANSACTION_ID_SCHEMA', 'Unsupported TransactionId schema.');
  }
  if (record.version !== SERIALIZATION_VERSION) {
    throw new TransactionIdentityError('TRANSACTION_ID_VERSION', 'Unsupported TransactionId version.');
  }
  return createTransactionId(record.value);
}
