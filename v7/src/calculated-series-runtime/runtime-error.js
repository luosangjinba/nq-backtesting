/** Stable live calculated-series instance/runtime failure. */
export class CalculatedSeriesRuntimeError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = 'CalculatedSeriesRuntimeError';
    this.code = code;
  }
}

export function failCalculatedSeriesRuntime(code, message, options) {
  throw new CalculatedSeriesRuntimeError(code, message, options);
}
