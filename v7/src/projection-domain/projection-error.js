/** Stable pure Projection Domain validation failure. */
export class ProjectionDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProjectionDomainError';
    this.code = code;
  }
}

export function failProjection(code, message) {
  throw new ProjectionDomainError(code, message);
}
