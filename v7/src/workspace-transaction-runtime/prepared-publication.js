import {
  createPreparedCommit,
  requireMatchingPreparedCommitReceipt,
} from '../prepared-commit-contract/public.js';
import { WorkspaceTransactionRuntimeError } from './runtime-error.js';

function requireSynchronous(result, operation) {
  if (result && typeof result.then === 'function') {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_PUBLICATION_MUST_BE_SYNCHRONOUS',
      `Publication ${operation} must complete in the coordinator's final synchronous turn.`,
    );
  }
  return result;
}

class PreparedPublicationValue {
  #contract;
  #identity;
  #port;
  #stage;
  #state;

  constructor({ baseRevision, candidate, identity, port, stage, state }) {
    this.#contract = createPreparedCommit({
      baseRevision,
      candidate,
      identity,
      participant: 'publication',
      preparedRevision: baseRevision,
      schemaVersion: 1,
    });
    this.#identity = identity;
    this.#port = port;
    this.#stage = stage;
    this.#state = state;
    Object.freeze(this);
  }

  apply() {
    const snapshot = this.#contract.snapshot();
    this.#state.requirePublishable(this.#identity, snapshot.baseRevision);
    try {
      requireSynchronous(this.#port.apply(this.#stage), 'apply');
      return this.#contract.apply({
        identity: this.#identity,
        resultingRevision: snapshot.targetRevision,
      });
    } catch (error) {
      try { requireSynchronous(this.#port.rollback(this.#stage), 'rollback'); } catch { /* Preserve apply failure. */ }
      try {
        this.#contract.rollback({
          commitReceipt: null,
          identity: this.#identity,
          resultingRevision: snapshot.baseRevision,
        });
      } catch { /* Owner apply may already have crossed the branded boundary. */ }
      throw error;
    }
  }

  dispose() {
    const status = this.#contract.snapshot().status;
    if (status === 'applied') return this.#contract.dispose();
    if (status === 'prepared') requireSynchronous(this.#port.rollback(this.#stage), 'rollback');
    return this.#contract.dispose();
  }

  finalize(commitReceipt) {
    const snapshot = this.#contract.snapshot();
    requireMatchingPreparedCommitReceipt(commitReceipt, this.#contract);
    this.#state.requirePublishable(this.#identity, snapshot.baseRevision);
    requireSynchronous(this.#port.finalize(this.#stage), 'finalize');
    this.#state.publish({
      candidate: snapshot.candidate,
      expectedRevision: snapshot.targetRevision,
    });
    return this.#contract.finalize({
      commitReceipt,
      identity: this.#identity,
      resultingRevision: snapshot.targetRevision,
    });
  }

  rollback(commitReceipt = null) {
    const snapshot = this.#contract.snapshot();
    if (snapshot.status === 'applied') {
      requireMatchingPreparedCommitReceipt(commitReceipt, this.#contract);
    }
    requireSynchronous(this.#port.rollback(this.#stage), 'rollback');
    return this.#contract.rollback({
      commitReceipt,
      identity: this.#identity,
      resultingRevision: snapshot.baseRevision,
    });
  }

  snapshot() { return this.#contract.snapshot(); }
}

export function createPreparedPublication({ candidate, identity, port, state }) {
  const decision = state.preparePublication(identity);
  const stage = requireSynchronous(port.stage(Object.freeze({ candidate, identity })), 'stage');
  return new PreparedPublicationValue({
    baseRevision: decision.baseRevision,
    candidate,
    identity,
    port,
    stage,
    state,
  });
}
