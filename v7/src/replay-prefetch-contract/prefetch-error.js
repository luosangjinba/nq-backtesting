/** Stable failure for pure Replay prefetch advice. */
export class ReplayPrefetchContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReplayPrefetchContractError';
    this.code = code;
  }
}
