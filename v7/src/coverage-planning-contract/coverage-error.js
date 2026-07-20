/** Stable public error for coverage values and bounded acquisition plans. */
export class CoveragePlanningError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'CoveragePlanningError';
    this.code = code;
  }
}

export function failCoveragePlanning(code, message) {
  throw new CoveragePlanningError(code, message);
}
