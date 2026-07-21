/** Stable public failure for complete Pane-set acquisition/projection adaptation. */
export class PaneSetMaterializationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaneSetMaterializationError';
    this.code = code;
  }
}

export function failPaneSetMaterialization(code, message) {
  throw new PaneSetMaterializationError(code, message);
}
