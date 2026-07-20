/** Stable mutable Replay owner failure. */
export class ReplayRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReplayRuntimeError';
    this.code = code;
  }
}
