/** Stable owner error for unavailable, stale, or unsettled Core Plugin profile transactions. */
export class CorePluginProfileError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'CorePluginProfileError';
    this.code = code;
  }
}

export function failCorePluginProfile(code, message, options) {
  throw new CorePluginProfileError(code, message, options);
}
