/** Stable failure raised by the Prepared Commit public contract. */
export class PreparedCommitContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PreparedCommitContractError';
    this.code = code;
  }
}

export function failPreparedCommit(code, message) {
  throw new PreparedCommitContractError(code, message);
}
