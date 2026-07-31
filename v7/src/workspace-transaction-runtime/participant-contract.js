import { workspaceTransactionIdentitiesEqual } from '../workspace-transaction-contract/public.js';
import { WorkspaceTransactionRuntimeError } from './runtime-error.js';

const METHODS = Object.freeze(['apply', 'dispose', 'finalize', 'rollback', 'snapshot']);

/** Validate one owner-issued prepared lifecycle before the coordinator can mutate it. */
export function requirePreparedParticipant(candidate, participant, identity) {
  if (!candidate || typeof candidate !== 'object'
    || METHODS.some((method) => typeof candidate[method] !== 'function')) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_PREPARED_PARTICIPANT_INVALID',
      `${participant} must provide the complete prepared lifecycle.`,
    );
  }
  const snapshot = candidate.snapshot();
  if (snapshot?.participant !== participant || snapshot.status !== 'prepared'
    || !workspaceTransactionIdentitiesEqual(snapshot.identity, identity)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_PREPARED_PARTICIPANT_MISMATCH',
      `${participant} preparation does not match the current Workspace transaction.`,
    );
  }
  return candidate;
}
