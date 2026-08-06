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
      let recoveryFailure = null;
      try {
        requireSynchronous(this.#port.rollback(this.#stage), 'rollback');
      } catch (rollbackError) {
        recoveryFailure = rollbackError;
      }
      if (recoveryFailure !== null) {
        throw new WorkspaceTransactionRuntimeError(
          'WORKSPACE_PUBLICATION_RECOVERY_FAILED',
          'Publication apply failed and its accepted state could not be restored.',
          { cause: new AggregateError([error, recoveryFailure]) },
        );
      }
      try {
        this.#contract.rollback({
          commitReceipt: null,
          identity: this.#identity,
          resultingRevision: snapshot.baseRevision,
        });
      } catch (rollbackError) {
        throw new WorkspaceTransactionRuntimeError(
          'WORKSPACE_PUBLICATION_RECOVERY_FAILED',
          'Publication owner restored, but its prepared lifecycle could not roll back.',
          { cause: new AggregateError([error, rollbackError]) },
        );
      }
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
    // Publishing the coordinator snapshot is the one irreversible commit
    // decision. Owner finalization after this point is cleanup/retention work:
    // it may poison the runtime, but it must never turn the accepted decision
    // back into a failed transaction that attempts partial rollback.
    this.#state.publish({
      candidate: snapshot.candidate,
      expectedRevision: snapshot.targetRevision,
    });
    const finalized = this.#contract.finalize({
      commitReceipt,
      identity: this.#identity,
      resultingRevision: snapshot.targetRevision,
    });
    requireSynchronous(this.#port.finalize(this.#stage), 'finalize');
    return finalized;
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
