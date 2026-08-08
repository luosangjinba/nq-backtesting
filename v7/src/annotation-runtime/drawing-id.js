import { failAnnotation } from './annotation-error.js';

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

class DrawingIdValue {
  #token;

  constructor(token) {
    this.#token = token;
    Object.freeze(this);
  }

  read() { return this.#token; }
}

/**
 * Owner: Annotation Runtime.
 * Purpose: create one caller-allocated opaque Drawing identity without a global allocator.
 * Inputs/outputs: exact opaque token; frozen branded Drawing id.
 * Side effects/lifecycle: none.
 * Errors: AnnotationRuntimeError for invalid tokens.
 * Concurrency/cancellation: synchronous and deterministic.
 */
export function createDrawingId(token) {
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    failAnnotation(
      'DRAWING_ID_INVALID',
      'Drawing id must be 1-128 exact opaque identifier characters.',
    );
  }
  return new DrawingIdValue(token);
}

/** Reject raw strings/lookalikes and return the exact opaque Drawing token. */
export function readDrawingId(candidate) {
  if (!(candidate instanceof DrawingIdValue)) {
    failAnnotation('DRAWING_ID_REQUIRED', 'A branded Drawing id is required.');
  }
  return candidate.read();
}
