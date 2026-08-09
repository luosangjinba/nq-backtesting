/** Stable public failure for the R13.5 transient Annotation interaction owner. */
export class AnnotationInteractionError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnnotationInteractionError';
    this.code = code;
  }
}

/** Throw one stable Interaction failure without leaking mutable owner state. */
export function failInteraction(code, message, options = {}) {
  throw new AnnotationInteractionError(code, message, options);
}
