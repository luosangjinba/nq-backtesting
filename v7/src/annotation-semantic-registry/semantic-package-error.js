export class AnnotationSemanticPackageError extends Error {
  constructor(code, message, { cause } = {}) {
    super(message, { cause });
    this.name = 'AnnotationSemanticPackageError';
    this.code = code;
    Object.freeze(this);
  }
}

export function failSemanticPackage(code, message, options) {
  throw new AnnotationSemanticPackageError(code, message, options);
}
