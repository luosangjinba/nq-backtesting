/** Stable public error for workspace replacement selection and routing failures. */
export class WorkspaceReplacementRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorkspaceReplacementRuntimeError';
    this.code = code;
  }
}

export function failReplacement(code, message) {
  throw new WorkspaceReplacementRuntimeError(code, message);
}
