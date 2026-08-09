import { failProjection } from './projection-error.js';

const PREVIEW_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

class AnnotationPreviewIdentityValue {
  #id;

  constructor(id) {
    this.#id = id;
    Object.freeze(this);
  }

  read() { return this.#id; }
}

/** Create one opaque caller-allocated identity for a transient Preview lifetime. */
export function createAnnotationPreviewIdentity(id) {
  if (typeof id !== 'string' || !PREVIEW_ID.test(id)) {
    failProjection(
      'ANNOTATION_PREVIEW_IDENTITY_INVALID',
      'Annotation Preview identity must be one opaque caller-allocated token.',
    );
  }
  return new AnnotationPreviewIdentityValue(id);
}

/** Reject structural lookalikes and expose only the opaque Preview token. */
export function readAnnotationPreviewIdentity(candidate) {
  if (!(candidate instanceof AnnotationPreviewIdentityValue)) {
    failProjection('ANNOTATION_PREVIEW_IDENTITY_REQUIRED', 'A branded Preview identity is required.');
  }
  return candidate.read();
}
