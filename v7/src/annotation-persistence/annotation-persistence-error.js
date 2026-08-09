/** Stable error raised by the durable Annotation byte adapter. */
export class AnnotationPersistenceError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnnotationPersistenceError';
    this.code = code;
  }
}

/** Raise one stable Annotation persistence boundary failure. */
export function failAnnotationPersistence(code, message, options) {
  throw new AnnotationPersistenceError(code, message, options);
}
