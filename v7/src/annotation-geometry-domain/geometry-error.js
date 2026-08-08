/** Stable public failure for malformed Annotation Geometry contracts. */
export class AnnotationGeometryError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnnotationGeometryError';
    this.code = code;
  }
}

/** Throw one stable Annotation Geometry failure without leaking implementation errors. */
export function failGeometry(code, message, options = {}) {
  throw new AnnotationGeometryError(code, message, options);
}
