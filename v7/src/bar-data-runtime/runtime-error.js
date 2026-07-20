/** Stable public error for Bar Data Runtime configuration and lifecycle failures. */
export class BarDataRuntimeError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'BarDataRuntimeError';
    this.code = code;
  }
}

export function failBarDataRuntime(code, message) {
  throw new BarDataRuntimeError(code, message);
}
