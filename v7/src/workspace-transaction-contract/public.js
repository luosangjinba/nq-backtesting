/**
 * Owner: workspace-transaction-runtime.
 * Purpose: expose the complete supported public contract for workspace transaction contract.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/**
 * Workspace transaction contract public facade.
 *
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: expose the complete identity/currency and lifecycle contracts while
 * keeping their implementation responsibilities in focused source files.
 * Inputs/outputs: documented by each re-exported public contract.
 * Side effects: none.
 * Errors: documented by each re-exported public contract.
 */

export {
  WorkspaceTransactionContractError,
  assessWorkspaceTransactionCurrency,
  createWorkspaceTransactionIdentity,
  readWorkspaceTransactionIdentity,
  requireWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from './identity-contract.js';
export {
  createWorkspaceTransactionIntent,
  createWorkspaceTransactionPlan,
  describeWorkspaceTransactionEnvelope,
  settleWorkspaceTransaction,
} from './lifecycle-contract.js';
