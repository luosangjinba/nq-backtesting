/**
 * Owner: pane-workspace-domain.
 * Purpose: expose the complete supported public contract for pane workspace domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for uniform one-to-many pane intent and Session-asset semantics. */
export { PaneWorkspaceDomainError } from './domain-error.js';
export { createPaneWorkspace, readPaneWorkspace } from './pane-workspace.js';
export {
  changePaneInstrument,
  changePaneTimeframe,
  focusPane,
  setPaneInstrumentSync,
} from './pane-transitions.js';
