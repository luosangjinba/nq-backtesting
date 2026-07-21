/** Stable public failure for shared Replay navigation routing and resolution. */
export class ReplayNavigationRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReplayNavigationRuntimeError';
    this.code = code;
  }
}

export function failReplayNavigation(code, message) {
  throw new ReplayNavigationRuntimeError(code, message);
}
