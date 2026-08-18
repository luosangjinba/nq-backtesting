/** Stable trusted-host formula execution failure. */
export class TrustedCalculatedSeriesExecutionError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = 'TrustedCalculatedSeriesExecutionError';
    this.code = code;
  }
}

export function failTrustedExecution(code, message, options) {
  throw new TrustedCalculatedSeriesExecutionError(code, message, options);
}
