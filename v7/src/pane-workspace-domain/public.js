/** Public facade for uniform one-to-many pane intent and Session-asset semantics. */
export { PaneWorkspaceDomainError } from './domain-error.js';
export { createPaneWorkspace, readPaneWorkspace } from './pane-workspace.js';
export {
  changePaneInstrument,
  changePaneTimeframe,
  focusPane,
  setPaneInstrumentSync,
} from './pane-transitions.js';
