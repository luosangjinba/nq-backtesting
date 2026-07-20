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
