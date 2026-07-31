/**
 * Owner: workspace-transaction-runtime.
 * Purpose: expose the complete supported public contract for prepared commit contract.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/**
 * Public participant-neutral Prepared Commit protocol.
 *
 * The contract owns no Chart, Replay, Workspace State, publication, DOM, or
 * persistence state. It binds one exact immutable candidate to complete
 * transaction identity and enforces prepare/apply/rollback/finalize ordering.
 */
export { PreparedCommitContractError } from './contract-error.js';
export {
  PREPARED_COMMIT_PARTICIPANTS,
  requirePreparedCommitParticipant,
} from './participant-contract.js';
export { createPreparedCommit, requirePreparedCommit } from './prepared-commit.js';
export {
  readPreparedCommitReceipt,
  readPreparedFinalizeReceipt,
  readPreparedRollbackReceipt,
  requireMatchingPreparedCommitReceipt,
  requireMatchingPreparedFinalizeReceipt,
  requireMatchingPreparedRollbackReceipt,
} from './receipt-contract.js';
