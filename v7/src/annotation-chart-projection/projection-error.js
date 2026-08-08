/** Stable public failure for the accepted Annotation Chart Projection contract. */
export class AnnotationChartProjectionError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnnotationChartProjectionError';
    this.code = code;
  }
}

/** Throw one stable accepted-projection failure. */
export function failProjection(code, message, options = {}) {
  throw new AnnotationChartProjectionError(code, message, options);
}
