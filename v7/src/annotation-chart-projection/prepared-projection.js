import { failProjection } from './projection-error.js';

class PreparedAnnotationProjectionValue {
  #snapshot;

  constructor(snapshot) {
    this.#snapshot = snapshot;
    Object.freeze(this);
  }

  read() { return this.#snapshot; }
}

class AnnotationProjectionReceiptValue {
  #prepared;
  #snapshot;

  constructor(prepared, snapshot) {
    this.#prepared = prepared;
    this.#snapshot = snapshot;
    Object.freeze(this);
  }

  matches(prepared) { return this.#prepared === prepared; }

  read() { return this.#snapshot; }
}

/** Create the private brand for one inert accepted-projection preparation. */
export function createPreparedAnnotationProjection(snapshot) {
  return new PreparedAnnotationProjectionValue(snapshot);
}

/** Reject structural lookalikes and expose immutable preparation metadata. */
export function readPreparedAnnotationProjection(candidate) {
  if (!(candidate instanceof PreparedAnnotationProjectionValue)) {
    failProjection(
      'ANNOTATION_PROJECTION_PREPARATION_REQUIRED',
      'A branded Annotation projection preparation is required.',
    );
  }
  return candidate.read();
}

/** Create one exact receipt bound by object identity to a preparation. */
export function createAnnotationProjectionReceipt(prepared, snapshot) {
  readPreparedAnnotationProjection(prepared);
  return new AnnotationProjectionReceiptValue(prepared, snapshot);
}

/** Read public receipt evidence without exposing its private preparation brand. */
export function readAnnotationProjectionReceipt(candidate) {
  if (!(candidate instanceof AnnotationProjectionReceiptValue)) {
    failProjection('ANNOTATION_PROJECTION_RECEIPT_REQUIRED', 'An exact projection receipt is required.');
  }
  return candidate.read();
}

/** Require that one receipt belongs to the exact preparation instance. */
export function requireMatchingAnnotationProjectionReceipt(candidate, prepared) {
  readAnnotationProjectionReceipt(candidate);
  if (!candidate.matches(prepared)) {
    failProjection(
      'ANNOTATION_PROJECTION_RECEIPT_MISMATCH',
      'Projection receipt belongs to another preparation.',
    );
  }
  return candidate;
}
