/** Stable error for invalid durable Session Workspace checkpoints. */
export class WorkspaceCheckpointDomainError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'WorkspaceCheckpointDomainError';
    this.code = code;
  }
}

export function failWorkspaceCheckpoint(code, message, options) {
  throw new WorkspaceCheckpointDomainError(code, message, options);
}
