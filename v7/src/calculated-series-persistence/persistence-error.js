/** Stable calculated-series sidecar byte failure. */
export class CalculatedSeriesPersistenceError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = 'CalculatedSeriesPersistenceError';
    this.code = code;
  }
}

export function failCalculatedSeriesPersistence(code, message, options) {
  throw new CalculatedSeriesPersistenceError(code, message, options);
}
