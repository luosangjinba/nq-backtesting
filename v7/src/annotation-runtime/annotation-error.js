/** Stable public failure for the headless Annotation Runtime contract. */
export class AnnotationRuntimeError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnnotationRuntimeError';
    this.code = code;
  }
}

/** Throw one stable Annotation Runtime failure. */
export function failAnnotation(code, message, options = {}) {
  throw new AnnotationRuntimeError(code, message, options);
}
