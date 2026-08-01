/**
 * Owner: projection-domain.
 * Purpose: expose the complete supported public contract for projection domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for provider-neutral pure pane projection. */
export { projectPaneReplayAdvance, projectPaneSnapshot } from './pane-projection.js';
export { projectPaneHistoryExtension } from './pane-history-extension.js';
export { createProjectedBar } from './projected-bar.js';
export {
  isProjectedPaneSnapshot,
  retargetProjectedPaneSnapshot,
} from './projected-pane-snapshot.js';
export { ProjectionDomainError } from './projection-error.js';
export {
  extendPaneProjectedHistory,
  preservePaneProjectedHistory,
  projectedHistoryOldestEpochMs,
} from './projected-history-composition.js';
