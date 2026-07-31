/**
 * Owner: pane-layout-domain.
 * Purpose: expose the complete supported public contract for pane layout domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for one-to-four Pane split-tree intent and resize constraints. */
export { PaneLayoutDomainError } from './layout-error.js';
export {
  createPaneLayout,
  deserializePaneLayout,
  PANE_LAYOUT_METRICS,
  PANE_LAYOUT_OPTIONS,
  readPaneLayout,
  resizePaneLayout,
  serializePaneLayout,
} from './pane-layout.js';
