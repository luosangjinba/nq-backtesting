import {
  WorkspaceTransactionContractError,
  readWorkspaceTransactionIdentity,
} from './identity-contract.js';

const OPERATION_PATTERN = /^[a-z][a-z0-9.-]{0,63}$/;
const FAILURE_CODE_PATTERN = /^[a-z][a-z0-9.-]{0,127}$/;
const TERMINAL_STATUSES = Object.freeze(['committed', 'rejected', 'stale', 'failed', 'cancelled']);

class TransactionEnvelopeValue {
  constructor({ code = null, identity, operation, phase, status = null }) {
    this.code = code;
    this.identity = identity;
    this.operation = operation;
    this.phase = phase;
    this.status = status;
    Object.freeze(this);
  }
}

function requireIdentity(candidate) {
  readWorkspaceTransactionIdentity(candidate);
  return candidate;
}

function requireOperation(operation) {
  if (typeof operation !== 'string' || !OPERATION_PATTERN.test(operation)) {
    throw new WorkspaceTransactionContractError(
      'WORKSPACE_TRANSACTION_OPERATION',
      'Workspace transaction operation must be a stable lowercase identifier.',
    );
  }
  return operation;
}

function requireEnvelope(candidate, phase) {
  if (!(candidate instanceof TransactionEnvelopeValue) || candidate.phase !== phase) {
    throw new WorkspaceTransactionContractError(
      'WORKSPACE_TRANSACTION_PHASE',
      `A branded ${phase} transaction envelope is required.`,
    );
  }
  requireIdentity(candidate.identity);
  return candidate;
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: create the immutable lifecycle envelope for one accepted UI intent.
 * Inputs: branded complete identity and stable generic operation id.
 * Outputs: frozen branded intent envelope.
 * Side effects: none; domain-specific immutable payload remains a separate contract.
 * Errors: identity errors or WORKSPACE_TRANSACTION_OPERATION.
 */
export function createWorkspaceTransactionIntent({ identity, operation }) {
  return new TransactionEnvelopeValue({
    identity: requireIdentity(identity),
    operation: requireOperation(operation),
    phase: 'intent',
  });
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: advance a validated immutable intent into its planning envelope.
 * Inputs: branded intent envelope.
 * Outputs: frozen branded plan envelope with the exact same identity/operation.
 * Side effects: none; planning I/O and pane data are outside this lifecycle shell.
 * Errors: WORKSPACE_TRANSACTION_PHASE.
 */
export function createWorkspaceTransactionPlan(intent) {
  const accepted = requireEnvelope(intent, 'intent');
  return new TransactionEnvelopeValue({
    identity: accepted.identity,
    operation: accepted.operation,
    phase: 'plan',
  });
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: create one immutable terminal result/failure envelope from a plan.
 * Inputs: branded plan plus one terminal status and optional stable failure code.
 * Outputs: frozen branded terminal envelope.
 * Side effects: none; it does not commit state or guarantee runtime liveness.
 * Errors: WORKSPACE_TRANSACTION_PHASE, WORKSPACE_TRANSACTION_TERMINAL_STATUS,
 * or WORKSPACE_TRANSACTION_TERMINAL_CODE.
 */
export function settleWorkspaceTransaction(plan, { code = null, status }) {
  const accepted = requireEnvelope(plan, 'plan');
  if (!TERMINAL_STATUSES.includes(status)) {
    throw new WorkspaceTransactionContractError(
      'WORKSPACE_TRANSACTION_TERMINAL_STATUS',
      'Transaction terminal status is not supported.',
    );
  }
  const committed = status === 'committed';
  if ((committed && code !== null) || (!committed && !FAILURE_CODE_PATTERN.test(code ?? ''))) {
    throw new WorkspaceTransactionContractError(
      'WORKSPACE_TRANSACTION_TERMINAL_CODE',
      'Committed results have no failure code; every other terminal status requires one.',
    );
  }
  return new TransactionEnvelopeValue({
    code,
    identity: accepted.identity,
    operation: accepted.operation,
    phase: 'terminal',
    status,
  });
}

/**
 * Owner: Workspace Transaction Runtime boundary.
 * Purpose: expose a read-only lifecycle view without removing brand validation.
 * Inputs: branded intent, plan, or terminal envelope.
 * Outputs: frozen shallow description containing immutable branded identity.
 * Side effects: none.
 * Errors: WORKSPACE_TRANSACTION_ENVELOPE_REQUIRED.
 */
export function describeWorkspaceTransactionEnvelope(envelope) {
  if (!(envelope instanceof TransactionEnvelopeValue)) {
    throw new WorkspaceTransactionContractError(
      'WORKSPACE_TRANSACTION_ENVELOPE_REQUIRED',
      'A branded workspace transaction envelope is required.',
    );
  }
  return Object.freeze({
    code: envelope.code,
    identity: requireIdentity(envelope.identity),
    operation: envelope.operation,
    phase: envelope.phase,
    status: envelope.status,
  });
}
