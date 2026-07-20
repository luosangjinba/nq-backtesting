/** Stable failures raised before a workspace intent enters the runtime lifecycle. */
export class WorkspaceTransactionRuntimeError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = 'WorkspaceTransactionRuntimeError';
    this.code = code;
  }
}
