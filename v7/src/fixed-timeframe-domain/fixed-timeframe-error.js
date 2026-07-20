/** Stable public error for fixed-duration alignment and aggregation failures. */
export class FixedTimeframeDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FixedTimeframeDomainError';
    this.code = code;
  }
}

export function failFixedTimeframe(code, message) {
  throw new FixedTimeframeDomainError(code, message);
}
