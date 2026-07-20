/** Stable public error for invalid provider policy values. */
export class ProviderPolicyError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'ProviderPolicyError';
    this.code = code;
  }
}

export function failProviderPolicy(code, message) {
  throw new ProviderPolicyError(code, message);
}
