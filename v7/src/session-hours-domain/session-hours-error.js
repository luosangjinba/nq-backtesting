/** Stable public error for Session Hours calendar and traversal failures. */
export class SessionHoursDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SessionHoursDomainError';
    this.code = code;
  }
}

export function failSessionHours(code, message) {
  throw new SessionHoursDomainError(code, message);
}
