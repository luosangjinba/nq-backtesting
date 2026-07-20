/** Stable validation failure for provider-independent Replay values. */
export class ReplayContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReplayContractError';
    this.code = code;
  }
}
