/** Stable public failure for invalid Pane layout values and resize proposals. */
export class PaneLayoutDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaneLayoutDomainError';
    this.code = code;
  }
}

export function failPaneLayout(code, message) {
  throw new PaneLayoutDomainError(code, message);
}
