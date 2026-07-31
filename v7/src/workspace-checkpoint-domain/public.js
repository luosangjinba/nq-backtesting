/**
 * Owner: workspace-checkpoint-domain.
 * Purpose: expose the complete supported public contract for workspace checkpoint domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for durable, data-independent Session Workspace checkpoints. */
export { WorkspaceCheckpointDomainError } from './domain-error.js';
export {
  createWorkspaceCheckpoint,
  deserializeWorkspaceCheckpoint,
  readWorkspaceCheckpoint,
  serializeWorkspaceCheckpoint,
} from './workspace-checkpoint.js';
