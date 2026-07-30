/** Stable Workspace State Runtime boundary failure. */
export class WorkspaceStateRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorkspaceStateRuntimeError';
    this.code = code;
  }
}

export function failWorkspaceState(code, message) {
  throw new WorkspaceStateRuntimeError(code, message);
}
