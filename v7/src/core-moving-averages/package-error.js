/** Stable failure raised by the trusted first-party Moving Averages package. */
export class MovingAveragesPackageError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = 'MovingAveragesPackageError';
    this.code = code;
  }
}

export function failMovingAverages(code, message, options) {
  throw new MovingAveragesPackageError(code, message, options);
}
