import {
  requireWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import { failPreparedCommit } from './contract-error.js';
import { requirePreparedCommitParticipant } from './participant-contract.js';
import {
  createPreparedCommitReceipt,
  createPreparedFinalizeReceipt,
  createPreparedRollbackReceipt,
  requireMatchingPreparedCommitReceipt,
} from './receipt-contract.js';

const CREATE_FIELDS = Object.freeze([
  'baseRevision',
  'candidate',
  'identity',
  'participant',
  'preparedRevision',
  'schemaVersion',
]);
const APPLY_FIELDS = Object.freeze(['identity', 'resultingRevision']);
const SETTLE_FIELDS = Object.freeze(['commitReceipt', 'identity', 'resultingRevision']);
const VERIFIED_DEEP_FROZEN = new WeakSet();

function requireExactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || fields.some((field) => !Object.hasOwn(value, field))
    || Object.keys(value).some((field) => !fields.includes(field))) {
    failPreparedCommit(code, `${label} fields do not match the Prepared Commit contract.`);
  }
}

function requireRevision(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failPreparedCommit(
      'PREPARED_COMMIT_REVISION_INVALID',
      `${field} must be a non-negative safe integer.`,
    );
  }
  return value;
}

function frozenState(value, seen) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return 2;
  if (VERIFIED_DEEP_FROZEN.has(value)) return 2;
  if (!Object.isFrozen(value)) return 0;
  if (seen.has(value)) return 1;
  seen.add(value);
  let cacheable = true;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    const accessor = !Object.hasOwn(descriptor, 'value');
    const childState = frozenState(accessor ? value[key] : descriptor.value, seen);
    if (childState === 0) return 0;
    if (accessor || childState === 1) cacheable = false;
  }
  if (cacheable) VERIFIED_DEEP_FROZEN.add(value);
  return cacheable ? 2 : 1;
}

function isDeepFrozen(value) {
  return frozenState(value, new WeakSet()) !== 0;
}

function requireCandidate(value) {
  if (!value || typeof value !== 'object' || !isDeepFrozen(value)) {
    failPreparedCommit(
      'PREPARED_COMMIT_CANDIDATE_IMMUTABLE',
      'Prepared Commit candidate must be one exact deeply immutable object.',
    );
  }
  return value;
}

function mutationPolicy(status) {
  if (status === 'applied') return 'reversible-only';
  if (status === 'finalized') return 'irreversible-accepted';
  return 'none';
}

class PreparedCommitValue {
  #commitReceipt = null;
  #scope;
  #status = 'prepared';

  constructor(scope) {
    this.#scope = scope;
    Object.freeze(this);
  }

  #requireIdentity(identity) {
    const candidate = requireWorkspaceTransactionIdentity(identity);
    if (!workspaceTransactionIdentitiesEqual(candidate, this.#scope.identity)) {
      failPreparedCommit(
        'PREPARED_COMMIT_IDENTITY_MISMATCH',
        'Prepared Commit operation belongs to another Workspace transaction.',
      );
    }
    return candidate;
  }

  #requireStatus(...allowed) {
    if (!allowed.includes(this.#status)) {
      failPreparedCommit(
        'PREPARED_COMMIT_PHASE_INVALID',
        `Prepared Commit is ${this.#status}; expected ${allowed.join(' or ')}.`,
      );
    }
  }

  #requireResultingRevision(value, expected) {
    requireRevision(value, 'resultingRevision');
    if (value !== expected) {
      failPreparedCommit(
        'PREPARED_COMMIT_RESULT_REVISION_INVALID',
        `Prepared Commit result must publish revision ${expected}.`,
      );
    }
    return value;
  }

  apply(input) {
    requireExactRecord(input, APPLY_FIELDS, 'PREPARED_COMMIT_APPLY_INVALID', 'Apply');
    this.#requireStatus('prepared');
    this.#requireIdentity(input.identity);
    const revision = this.#requireResultingRevision(
      input.resultingRevision,
      this.#scope.targetRevision,
    );
    this.#commitReceipt = createPreparedCommitReceipt(this, this.#scope, revision);
    this.#status = 'applied';
    return this.#commitReceipt;
  }

  dispose() {
    if (this.#status === 'disposed') return this.snapshot();
    if (this.#status === 'applied') {
      failPreparedCommit(
        'PREPARED_COMMIT_ROLLBACK_REQUIRED',
        'An applied participant must roll back before disposal.',
      );
    }
    this.#status = 'disposed';
    return this.snapshot();
  }

  finalize(input) {
    requireExactRecord(input, SETTLE_FIELDS, 'PREPARED_COMMIT_FINALIZE_INVALID', 'Finalize');
    this.#requireStatus('applied');
    this.#requireIdentity(input.identity);
    requireMatchingPreparedCommitReceipt(input.commitReceipt, this);
    const revision = this.#requireResultingRevision(
      input.resultingRevision,
      this.#scope.targetRevision,
    );
    this.#status = 'finalized';
    return createPreparedFinalizeReceipt(this, this.#scope, revision);
  }

  rollback(input) {
    requireExactRecord(input, SETTLE_FIELDS, 'PREPARED_COMMIT_ROLLBACK_INVALID', 'Rollback');
    this.#requireStatus('prepared', 'applied');
    this.#requireIdentity(input.identity);
    const applied = this.#status === 'applied';
    if (applied) requireMatchingPreparedCommitReceipt(input.commitReceipt, this);
    else if (input.commitReceipt !== null) {
      failPreparedCommit(
        'PREPARED_COMMIT_RECEIPT_MISMATCH',
        'An unapplied preparation cannot accept a commit receipt.',
      );
    }
    const revision = this.#requireResultingRevision(
      input.resultingRevision,
      this.#scope.baseRevision,
    );
    this.#status = 'rolled-back';
    return createPreparedRollbackReceipt(this, this.#scope, revision, applied);
  }

  snapshot() {
    return Object.freeze({
      ...this.#scope,
      mutationPolicy: mutationPolicy(this.#status),
      status: this.#status,
    });
  }
}

/**
 * Create one inert, exact-candidate participant preparation.
 *
 * Preparation proves `preparedRevision === baseRevision`; it grants no visible
 * or semantic mutation. Apply may advance exactly once to `targetRevision` but
 * remains reversible until an exact commit receipt is finalized. Rollback must
 * restore `baseRevision`. Disposal cannot abandon an applied participant.
 */
export function createPreparedCommit(value) {
  requireExactRecord(value, CREATE_FIELDS, 'PREPARED_COMMIT_INPUT_INVALID', 'Preparation');
  if (value.schemaVersion !== 1) {
    failPreparedCommit(
      'PREPARED_COMMIT_VERSION_UNSUPPORTED',
      'Prepared Commit requires schemaVersion 1.',
    );
  }
  const baseRevision = requireRevision(value.baseRevision, 'baseRevision');
  const preparedRevision = requireRevision(value.preparedRevision, 'preparedRevision');
  if (preparedRevision !== baseRevision) {
    failPreparedCommit(
      'PREPARED_COMMIT_PREPARE_MUTATION_FORBIDDEN',
      'Prepare must leave the participant on its exact base revision.',
    );
  }
  if (baseRevision === Number.MAX_SAFE_INTEGER) {
    failPreparedCommit(
      'PREPARED_COMMIT_REVISION_EXHAUSTED',
      'Prepared Commit target revision is exhausted.',
    );
  }
  return new PreparedCommitValue(Object.freeze({
    baseRevision,
    candidate: requireCandidate(value.candidate),
    identity: requireWorkspaceTransactionIdentity(value.identity),
    participant: requirePreparedCommitParticipant(value.participant),
    preparedRevision,
    schemaVersion: 1,
    targetRevision: baseRevision + 1,
  }));
}

/** Reject structural lookalikes and return the branded lifecycle handle. */
export function requirePreparedCommit(candidate) {
  if (!(candidate instanceof PreparedCommitValue)) {
    failPreparedCommit(
      'PREPARED_COMMIT_REQUIRED',
      'A branded Prepared Commit lifecycle is required.',
    );
  }
  candidate.snapshot();
  return candidate;
}
