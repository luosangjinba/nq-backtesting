import {
  assessWorkspaceTransactionCurrency,
  readWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import {
  activationGenerationsEqual,
  requireActivationGeneration,
} from '../activation-generation/public.js';
import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import { serializeTransactionId } from '../transaction-identity/public.js';
import { WorkspaceTransactionRuntimeError } from './runtime-error.js';

function transactionKey(identity) {
  return serializeTransactionId(readWorkspaceTransactionIdentity(identity).transactionId).value;
}

function requireScopedIdentity(identity, scope) {
  const parts = readWorkspaceTransactionIdentity(identity);
  if (!sessionIdsEqual(parts.sessionId, scope.sessionId)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_RUNTIME_SESSION_MISMATCH',
      'Workspace transaction belongs to another Session.',
    );
  }
  if (!activationGenerationsEqual(parts.activationGeneration, scope.activationGeneration)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_RUNTIME_ACTIVATION_MISMATCH',
      'Workspace transaction belongs to another activation.',
    );
  }
  return identity;
}

function freezeAcceptedSnapshot({ identity, operation, replay, revision, workspace, workspaceState }) {
  return Object.freeze({ identity, operation, replay, revision, workspace, workspaceState });
}

class WorkspaceTransactionRuntimeState {
  #acceptedRevision;
  #acceptedSnapshot;
  #active = new Map();
  #currentIdentity = null;
  #disposed = false;
  #poisonCode = null;
  #scope;
  #seenTransactionKeys = new Set();

  constructor({ activationGeneration, initialAcceptedSnapshot, sessionId }) {
    this.#scope = Object.freeze({
      activationGeneration: requireActivationGeneration(activationGeneration),
      sessionId: requireSessionId(sessionId),
    });
    if (initialAcceptedSnapshot !== null && !Object.isFrozen(initialAcceptedSnapshot)) {
      throw new WorkspaceTransactionRuntimeError(
        'WORKSPACE_INITIAL_SNAPSHOT_IMMUTABLE',
        'Initial accepted workspace snapshot must be null or frozen.',
      );
    }
    if (initialAcceptedSnapshot !== null
      && (!Number.isSafeInteger(initialAcceptedSnapshot.revision)
        || initialAcceptedSnapshot.revision < 0)) {
      throw new WorkspaceTransactionRuntimeError(
        'WORKSPACE_INITIAL_REVISION',
        'Initial accepted workspace revision must be a non-negative safe integer.',
      );
    }
    this.#acceptedSnapshot = initialAcceptedSnapshot;
    this.#acceptedRevision = initialAcceptedSnapshot?.revision ?? 0;
  }

  #requireActive() {
    if (this.#disposed) {
      throw new WorkspaceTransactionRuntimeError(
        'WORKSPACE_TRANSACTION_RUNTIME_DISPOSED',
        'Workspace Transaction Runtime is disposed.',
      );
    }
  }

  #requireHealthy() {
    this.#requireActive();
    if (this.#poisonCode !== null) {
      throw new WorkspaceTransactionRuntimeError(
        'WORKSPACE_TRANSACTION_RUNTIME_POISONED',
        `Workspace Transaction Runtime cannot accept work after ${this.#poisonCode}.`,
      );
    }
  }

  begin(identity) {
    this.#requireHealthy();
    requireScopedIdentity(identity, this.#scope);
    const key = transactionKey(identity);
    if (this.#seenTransactionKeys.has(key)) {
      throw new WorkspaceTransactionRuntimeError(
        'WORKSPACE_TRANSACTION_DUPLICATE',
        'A transaction identity may enter the runtime exactly once.',
      );
    }
    this.#seenTransactionKeys.add(key);
    for (const record of this.#active.values()) record.controller.abort('superseded');
    this.#currentIdentity = identity;
    const record = { controller: new AbortController(), identity, key, proposal: null };
    this.#active.set(key, record);
    return record;
  }

  currency(identity) {
    if (this.#disposed) return Object.freeze({ code: 'runtime-disposed', status: 'cancelled' });
    if (this.#poisonCode !== null) {
      return Object.freeze({ code: 'runtime-poisoned', status: 'cancelled' });
    }
    if (!this.#currentIdentity) {
      return Object.freeze({ code: 'transaction-superseded', status: 'stale' });
    }
    const decision = assessWorkspaceTransactionCurrency({
      candidate: identity,
      current: this.#currentIdentity,
    });
    return decision.status === 'current'
      ? Object.freeze({ code: null, status: 'current' })
      : Object.freeze({ code: decision.reason, status: 'stale' });
  }

  preparePublication(identity) {
    const decision = this.currency(identity);
    if (decision.status !== 'current') return decision;
    if (this.#acceptedRevision === Number.MAX_SAFE_INTEGER) {
      throw new WorkspaceTransactionRuntimeError(
        'WORKSPACE_REVISION_EXHAUSTED',
        'Accepted workspace revision is exhausted.',
      );
    }
    return Object.freeze({
      baseRevision: this.#acceptedRevision,
      code: null,
      status: 'current',
      targetRevision: this.#acceptedRevision + 1,
    });
  }

  publish({ candidate, expectedRevision }) {
    const decision = this.preparePublication(candidate.identity);
    if (expectedRevision !== decision.targetRevision || candidate.revision !== expectedRevision) {
      throw new WorkspaceTransactionRuntimeError(
        'WORKSPACE_PUBLICATION_REVISION_INVALID',
        'Publication must advance the exact prepared Workspace revision.',
      );
    }
    this.#acceptedRevision = expectedRevision;
    this.#acceptedSnapshot = freezeAcceptedSnapshot({
      identity: candidate.identity,
      operation: candidate.operation,
      replay: candidate.replay,
      revision: this.#acceptedRevision,
      workspace: candidate.workspace,
      workspaceState: candidate.workspaceState,
    });
    return Object.freeze({ code: null, status: 'committed' });
  }

  requirePublishable(identity, baseRevision) {
    const decision = this.preparePublication(identity);
    if (decision.baseRevision !== baseRevision) {
      throw new WorkspaceTransactionRuntimeError(
        'WORKSPACE_PUBLICATION_BASE_REVISION_STALE',
        'Publication preparation no longer matches the accepted Workspace revision.',
      );
    }
  }

  finish(record) {
    this.#active.delete(record.key);
  }

  isDisposed() {
    return this.#disposed;
  }

  isDecisionCommitted(identity) {
    return this.#acceptedSnapshot?.identity !== undefined
      && this.#acceptedSnapshot.identity !== null
      && workspaceTransactionIdentitiesEqual(identity, this.#acceptedSnapshot.identity);
  }

  poison(code) {
    if (this.#poisonCode !== null) return;
    this.#poisonCode = code;
    for (const record of this.#active.values()) record.controller.abort('runtime-poisoned');
  }

  matchesCurrent(identity) {
    return this.#currentIdentity !== null
      && workspaceTransactionIdentitiesEqual(identity, this.#currentIdentity);
  }

  snapshot() {
    this.#requireActive();
    return Object.freeze({
      acceptedRevision: this.#acceptedRevision,
      acceptedSnapshot: this.#acceptedSnapshot,
      activationGeneration: this.#scope.activationGeneration,
      currentIdentity: this.#currentIdentity,
      health: this.#poisonCode === null ? 'ready' : 'poisoned',
      inFlightCount: this.#active.size,
      poisonCode: this.#poisonCode,
      sessionId: this.#scope.sessionId,
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const record of this.#active.values()) record.controller.abort('disposed');
  }
}

/** Own coordinator lifecycle, current identity, and accepted workspace revision only. */
export function createWorkspaceTransactionRuntimeState(options) {
  return new WorkspaceTransactionRuntimeState(options);
}
