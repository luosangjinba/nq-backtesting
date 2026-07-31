import {
  createPreparedCommit,
  requireMatchingPreparedCommitReceipt,
} from '../prepared-commit-contract/public.js';
import { ReplayRuntimeError } from './runtime-error.js';

class PreparedReplayCommitValue {
  #contract;
  #hooks;
  #identity;

  constructor({ baseRevision, candidate, hooks, identity }) {
    this.#contract = createPreparedCommit({
      baseRevision,
      candidate,
      identity,
      participant: 'replay',
      preparedRevision: baseRevision,
      schemaVersion: 1,
    });
    this.#hooks = hooks;
    this.#identity = identity;
    Object.freeze(this);
  }

  apply() {
    const targetRevision = this.#contract.snapshot().targetRevision;
    this.#hooks.apply();
    try {
      return this.#contract.apply({
        identity: this.#identity,
        resultingRevision: targetRevision,
      });
    } catch (error) {
      this.#hooks.rollback();
      throw error;
    }
  }

  dispose() {
    const status = this.#contract.snapshot().status;
    if (status === 'applied') return this.#contract.dispose();
    if (status === 'prepared') this.#hooks.release();
    return this.#contract.dispose();
  }

  finalize(commitReceipt) {
    const snapshot = this.#contract.snapshot();
    requireMatchingPreparedCommitReceipt(commitReceipt, this.#contract);
    this.#hooks.finalize();
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
      this.#hooks.rollback();
    } else {
      this.#hooks.release();
    }
    return this.#contract.rollback({
      commitReceipt,
      identity: this.#identity,
      resultingRevision: snapshot.baseRevision,
    });
  }

  snapshot() { return this.#contract.snapshot(); }
}

export function createPreparedReplayCommit(options) {
  return new PreparedReplayCommitValue(options);
}

export function requirePreparedReplayCommit(candidate) {
  if (!(candidate instanceof PreparedReplayCommitValue)) {
    throw new ReplayRuntimeError(
      'PREPARED_REPLAY_COMMIT_REQUIRED',
      'A branded prepared Replay commit is required.',
    );
  }
  candidate.snapshot();
  return candidate;
}
