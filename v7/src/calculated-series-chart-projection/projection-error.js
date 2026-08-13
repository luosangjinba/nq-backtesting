/** Stable failure type for the calculated-series Chart-owned projection boundary. */
export class CalculatedSeriesChartProjectionError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'CalculatedSeriesChartProjectionError';
    this.code = code;
  }
}

export function failCalculatedSeriesChartProjection(code, message, options = {}) {
  throw new CalculatedSeriesChartProjectionError(code, message, options);
}
