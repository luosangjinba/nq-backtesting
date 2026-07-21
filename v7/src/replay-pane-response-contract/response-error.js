/** Stable public failure for Replay-to-Pane response planning. */
export class ReplayPaneResponseContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReplayPaneResponseContractError';
    this.code = code;
  }
}

export function failReplayPaneResponse(code, message) {
  throw new ReplayPaneResponseContractError(code, message);
}
