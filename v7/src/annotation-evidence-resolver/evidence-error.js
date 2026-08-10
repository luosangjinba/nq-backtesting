export class AnnotationEvidenceError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnnotationEvidenceError';
    this.code = code;
  }
}

export function failEvidence(code, message, options) {
  throw new AnnotationEvidenceError(code, message, options);
}
