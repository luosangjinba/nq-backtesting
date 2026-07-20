/** Stable public error for policy-bound provider execution failures. */
export class ProviderExecutionError extends Error {
  constructor(code, message, { kind = null, retryAfterMs = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ProviderExecutionError';
    this.code = code;
    this.kind = kind;
    this.retryAfterMs = retryAfterMs;
  }
}

export function failProviderExecution(code, message, options) {
  throw new ProviderExecutionError(code, message, options);
}
