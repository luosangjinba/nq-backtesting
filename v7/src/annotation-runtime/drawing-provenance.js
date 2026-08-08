import { failAnnotation } from './annotation-error.js';

const FIELDS = Object.freeze([
  'createdAtEpochMs',
  'observedAtReplayCutoffEpochMs',
  'origin',
]);
const ORIGINS = new Set(['import', 'manual']);

class DrawingProvenanceValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

function requireEpoch(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failAnnotation('DRAWING_PROVENANCE_EPOCH_INVALID', `${field} must be a non-negative safe integer.`);
  }
  return value;
}

/**
 * Owner: Annotation Runtime.
 * Purpose: preserve generic-Drawing origin, wall-clock creation, and exact Replay cutoff separately.
 * Inputs/outputs: exact provenance record; frozen branded provenance.
 * Side effects/lifecycle: none.
 * Errors: AnnotationRuntimeError for fields, origin, or epoch values.
 * Concurrency/cancellation: synchronous and deterministic.
 */
export function createDrawingProvenance(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...FIELDS].sort().join(',')) {
    failAnnotation('DRAWING_PROVENANCE_FIELDS_INVALID', 'Drawing provenance fields must be exact.');
  }
  if (!ORIGINS.has(value.origin)) {
    failAnnotation('DRAWING_PROVENANCE_ORIGIN_INVALID', 'Drawing provenance origin is unsupported.');
  }
  return new DrawingProvenanceValue({
    createdAtEpochMs: requireEpoch(value.createdAtEpochMs, 'createdAtEpochMs'),
    observedAtReplayCutoffEpochMs: requireEpoch(
      value.observedAtReplayCutoffEpochMs,
      'observedAtReplayCutoffEpochMs',
    ),
    origin: value.origin,
  });
}

/** Reject structural lookalikes and expose the immutable provenance record. */
export function readDrawingProvenance(candidate) {
  if (!(candidate instanceof DrawingProvenanceValue)) {
    failAnnotation('DRAWING_PROVENANCE_REQUIRED', 'Branded Drawing provenance is required.');
  }
  return candidate.read();
}
