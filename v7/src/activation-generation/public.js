/**
 * Owner: session-store.
 * Purpose: expose the complete supported public contract for activation generation.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/**
 * Activation generation public contract.
 *
 * Owner: Session Store boundary.
 * Purpose: distinguish successive activations of a Session so work started by
 * an older activation can never be accepted by a newer activation.
 * Inputs: positive safe-integer generations or the exact versioned wire form.
 * Outputs: frozen branded ActivationGeneration values.
 * Side effects: none; this module owns no counter, active Session, or runtime.
 * Errors: ActivationGenerationError with a stable code for invalid input.
 */

const SERIALIZATION_SCHEMA = 'v7.activation-generation';
const SERIALIZATION_VERSION = 1;

class ActivationGenerationValue {
  #value;

  constructor(value) {
    this.#value = value;
    Object.freeze(this);
  }

  value() {
    return this.#value;
  }
}

/**
 * Owner: Session Store boundary.
 * Purpose: expose stable activation-generation validation failures.
 * Inputs: stable error code and explanatory message.
 * Outputs: Error instance named `ActivationGenerationError`.
 * Side effects: captures the normal JavaScript error stack only.
 * Errors: none.
 */
export class ActivationGenerationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ActivationGenerationError';
    this.code = code;
  }
}

function requireValidValue(value) {
  if (typeof value !== 'number') {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_TYPE',
      'Activation generation must be a number.',
    );
  }
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_RANGE',
      'Activation generation must be a positive safe integer.',
    );
  }
  return value;
}

function readValue(candidate) {
  if (!(candidate instanceof ActivationGenerationValue)) {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_REQUIRED',
      'A branded ActivationGeneration is required; raw values and lookalikes are rejected.',
    );
  }
  try {
    return candidate.value();
  } catch {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_REQUIRED',
      'A valid branded ActivationGeneration is required.',
    );
  }
}

/**
 * Owner: Session Store boundary.
 * Purpose: create a branded activation generation from an assigned ordinal.
 * Inputs: positive safe integer.
 * Outputs: frozen ActivationGeneration value.
 * Side effects: none; allocation belongs to the future activation owner.
 * Errors: ACTIVATION_GENERATION_TYPE or ACTIVATION_GENERATION_RANGE.
 *
 * Protected invariant — stale-rejection: a generation is not a pane-local
 * retry counter. V6 used independent counters in history, prewarm, pane reload,
 * and Auto Replay, so none could prove that a completion still belonged to the
 * currently activated Session instance.
 */
export function createActivationGeneration(value) {
  return new ActivationGenerationValue(requireValidValue(value));
}

/**
 * Owner: Session Store boundary.
 * Purpose: fail fast at every future activation-scoped public boundary.
 * Inputs: unknown candidate value.
 * Outputs: the same branded ActivationGeneration.
 * Side effects: none.
 * Errors: ACTIVATION_GENERATION_REQUIRED.
 */
export function requireActivationGeneration(candidate) {
  readValue(candidate);
  return candidate;
}

/**
 * Owner: Session Store boundary.
 * Purpose: derive the strictly later generation for a new activation.
 * Inputs: current branded ActivationGeneration.
 * Outputs: new frozen ActivationGeneration with ordinal increased by one.
 * Side effects: none; no module-global counter is changed.
 * Errors: ACTIVATION_GENERATION_REQUIRED or ACTIVATION_GENERATION_EXHAUSTED.
 */
export function nextActivationGeneration(current) {
  const value = readValue(current);
  if (value === Number.MAX_SAFE_INTEGER) {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_EXHAUSTED',
      'Activation generation cannot advance beyond Number.MAX_SAFE_INTEGER.',
    );
  }
  return createActivationGeneration(value + 1);
}

/**
 * Owner: Session Store boundary.
 * Purpose: compare two validated activation generations.
 * Inputs: two branded ActivationGeneration values.
 * Outputs: boolean ordinal equality.
 * Side effects: none.
 * Errors: ACTIVATION_GENERATION_REQUIRED for either invalid input.
 */
export function activationGenerationsEqual(left, right) {
  return readValue(left) === readValue(right);
}

/**
 * Owner: Session Store boundary.
 * Purpose: cross a diagnostic or transport boundary with an explicit schema.
 * Inputs: branded ActivationGeneration.
 * Outputs: frozen JSON-compatible `{ schema, version, value }` record.
 * Side effects: none.
 * Errors: ACTIVATION_GENERATION_REQUIRED.
 */
export function serializeActivationGeneration(generation) {
  return Object.freeze({
    schema: SERIALIZATION_SCHEMA,
    version: SERIALIZATION_VERSION,
    value: readValue(generation),
  });
}

/**
 * Owner: Session Store boundary.
 * Purpose: validate and restore the sole supported activation-generation form.
 * Inputs: exact `{ schema, version, value }` record.
 * Outputs: new frozen ActivationGeneration.
 * Side effects: none.
 * Errors: ACTIVATION_GENERATION_SERIALIZED_SHAPE,
 * ACTIVATION_GENERATION_SCHEMA, ACTIVATION_GENERATION_VERSION, or value errors.
 */
export function deserializeActivationGeneration(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_SERIALIZED_SHAPE',
      'Serialized activation generation must be an object.',
    );
  }
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== 'schema,value,version') {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_SERIALIZED_SHAPE',
      'Serialized activation generation must contain only schema, version, and value.',
    );
  }
  if (record.schema !== SERIALIZATION_SCHEMA) {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_SCHEMA',
      'Unsupported activation-generation schema.',
    );
  }
  if (record.version !== SERIALIZATION_VERSION) {
    throw new ActivationGenerationError(
      'ACTIVATION_GENERATION_VERSION',
      'Unsupported activation-generation version.',
    );
  }
  return createActivationGeneration(record.value);
}
