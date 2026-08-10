export class AnnotationContextProjectionError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnnotationContextProjectionError';
    this.code = code;
  }
}

export function failContextProjection(code, message, options) {
  throw new AnnotationContextProjectionError(code, message, options);
}
