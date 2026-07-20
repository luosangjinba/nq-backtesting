import {
  activationGenerationsEqual,
  requireActivationGeneration,
} from '../activation-generation/public.js';
import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import { requireTransactionId, transactionIdsEqual } from '../transaction-identity/public.js';

const NO_SIDE_EFFECTS = Object.freeze([]);
const COMMIT_SIDE_EFFECT = Object.freeze(['commit']);

class WorkspaceTransactionIdentityValue {
  #parts;

  constructor(sessionId, activationGeneration, transactionId) {
    this.#parts = Object.freeze({ activationGeneration, sessionId, transactionId });
    Object.freeze(this);
  }

  parts() {
    return this.#parts;
  }
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: expose stable identity and lifecycle-contract validation failures.
 * Inputs: stable error code and explanatory message.
 * Outputs: Error instance named `WorkspaceTransactionContractError`.
 * Side effects: captures the normal JavaScript error stack only.
 * Errors: none.
 */
export class WorkspaceTransactionContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorkspaceTransactionContractError';
    this.code = code;
  }
}

export function readWorkspaceTransactionIdentity(candidate) {
  if (!(candidate instanceof WorkspaceTransactionIdentityValue)) {
    throw new WorkspaceTransactionContractError(
      'WORKSPACE_TRANSACTION_IDENTITY_REQUIRED',
      'A branded workspace transaction identity is required.',
    );
  }
  let parts;
  try {
    parts = candidate.parts();
  } catch {
    throw new WorkspaceTransactionContractError(
      'WORKSPACE_TRANSACTION_IDENTITY_REQUIRED',
      'A valid branded workspace transaction identity is required.',
    );
  }
  requireSessionId(parts.sessionId);
  requireActivationGeneration(parts.activationGeneration);
  requireTransactionId(parts.transactionId);
  return parts;
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: compose the complete identity required by every future transaction.
 * Inputs: branded SessionId, ActivationGeneration, and TransactionId.
 * Outputs: frozen branded workspace transaction identity.
 * Side effects: none.
 * Errors: component identity validation errors.
 *
 * Protected invariant — stale-rejection: all three identity components are
 * mandatory. Cancellation is only resource cleanup; a late completion is safe
 * only when this complete tuple still matches the accepted current tuple.
 */
export function createWorkspaceTransactionIdentity({
  sessionId,
  activationGeneration,
  transactionId,
}) {
  return new WorkspaceTransactionIdentityValue(
    requireSessionId(sessionId),
    requireActivationGeneration(activationGeneration),
    requireTransactionId(transactionId),
  );
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: validate a complete branded transaction identity at public ports.
 * Inputs: unknown candidate.
 * Outputs: the same branded identity.
 * Side effects: none.
 * Errors: WORKSPACE_TRANSACTION_IDENTITY_REQUIRED or component errors.
 */
export function requireWorkspaceTransactionIdentity(candidate) {
  readWorkspaceTransactionIdentity(candidate);
  return candidate;
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: compare complete validated transaction identities.
 * Inputs: two branded workspace transaction identities.
 * Outputs: boolean equality across all three identity components.
 * Side effects: none.
 * Errors: WORKSPACE_TRANSACTION_IDENTITY_REQUIRED or component errors.
 */
export function workspaceTransactionIdentitiesEqual(left, right) {
  const leftParts = readWorkspaceTransactionIdentity(left);
  const rightParts = readWorkspaceTransactionIdentity(right);
  return sessionIdsEqual(leftParts.sessionId, rightParts.sessionId)
    && activationGenerationsEqual(leftParts.activationGeneration, rightParts.activationGeneration)
    && transactionIdsEqual(leftParts.transactionId, rightParts.transactionId);
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: decide whether a completion may still commit to the current owner.
 * Inputs: candidate completion identity and current accepted identity.
 * Outputs: frozen current/stale decision with deterministic mismatch reason.
 * Side effects: none; stale decisions always declare zero allowed side effects.
 * Errors: WORKSPACE_TRANSACTION_IDENTITY_REQUIRED or component errors.
 */
export function assessWorkspaceTransactionCurrency({ candidate, current }) {
  const candidateParts = readWorkspaceTransactionIdentity(candidate);
  const currentParts = readWorkspaceTransactionIdentity(current);
  let reason = null;
  if (!sessionIdsEqual(candidateParts.sessionId, currentParts.sessionId)) reason = 'session-mismatch';
  else if (!activationGenerationsEqual(
    candidateParts.activationGeneration,
    currentParts.activationGeneration,
  )) {
    reason = 'activation-mismatch';
  } else if (!transactionIdsEqual(candidateParts.transactionId, currentParts.transactionId)) {
    reason = 'transaction-mismatch';
  }
  return Object.freeze({
    allowedSideEffects: reason ? NO_SIDE_EFFECTS : COMMIT_SIDE_EFFECT,
    reason,
    status: reason ? 'stale' : 'current',
  });
}
