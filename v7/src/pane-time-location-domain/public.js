/**
 * Owner: pane-time-location-domain.
 * Purpose: expose the complete supported public contract for pane time location domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for explicit cross-Pane market-time location contracts. */
export {
  createPaneTimeLocationCommand,
  createPaneTimeLocationSelection,
  PaneTimeLocationDomainError,
  planPaneTimeLocation,
  readPaneTimeLocationCommand,
  readPaneTimeLocationSelection,
} from './pane-time-location.js';
