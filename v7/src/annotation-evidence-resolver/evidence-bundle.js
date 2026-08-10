import { failEvidence } from './evidence-error.js';

class AnnotationEvidenceBundleValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

export function createAnnotationEvidenceBundle(value) {
  return new AnnotationEvidenceBundleValue(Object.freeze(value));
}

/** Read one branded immutable evidence bundle returned by the pure resolver. */
export function readAnnotationEvidenceBundle(candidate) {
  if (!(candidate instanceof AnnotationEvidenceBundleValue)) {
    failEvidence('EVIDENCE_BUNDLE_REQUIRED', 'A branded Annotation Evidence Bundle is required.');
  }
  return candidate.read();
}
