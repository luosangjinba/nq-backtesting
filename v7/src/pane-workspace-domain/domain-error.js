/** Stable public failure for Pane Workspace contract and transition violations. */
export class PaneWorkspaceDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaneWorkspaceDomainError';
    this.code = code;
  }
}

export function failPaneWorkspace(code, message) {
  throw new PaneWorkspaceDomainError(code, message);
}
