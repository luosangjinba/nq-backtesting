import {
  createPreparedCommit,
  requireMatchingPreparedCommitReceipt,
} from '../prepared-commit-contract/public.js';
import { failChartApplication } from './application-error.js';
import { requireMatchingAdapterReceipt } from './adapter-receipt.js';

class PreparedChartApplicationValue {
  #adapter;
  #contract;
  #identity;
  #isCurrent;
  #signal;
  #staged;
  #state;
  #workspaceSnapshot;

  constructor({ adapter, baseRevision, identity, isCurrent, signal, staged, state, workspaceSnapshot }) {
    this.#adapter = adapter;
    this.#contract = createPreparedCommit({
      baseRevision,
      candidate: workspaceSnapshot,
      identity,
      participant: 'chart',
      preparedRevision: baseRevision,
      schemaVersion: 1,
    });
    this.#identity = identity;
    this.#isCurrent = isCurrent;
    this.#signal = signal;
    this.#staged = staged;
    this.#state = state;
    this.#workspaceSnapshot = workspaceSnapshot;
    Object.freeze(this);
  }

  async apply() {
    if (!this.#isCurrent()) {
      failChartApplication('CHART_APPLICATION_STALE', 'Chart preparation is stale.');
    }
    const targetRevision = this.#contract.snapshot().targetRevision;
    try {
      const receipt = await this.#adapter.applyVisible(Object.freeze({
        identity: this.#identity,
        isCurrent: this.#isCurrent,
        signal: this.#signal,
        staged: this.#staged,
        workspaceSnapshot: this.#workspaceSnapshot,
      }));
      if (!this.#isCurrent()) {
        failChartApplication('CHART_APPLICATION_STALE', 'Chart preparation is stale.');
      }
      requireMatchingAdapterReceipt(receipt, {
        identity: this.#identity,
        workspaceSnapshot: this.#workspaceSnapshot,
      }, targetRevision);
      return this.#contract.apply({
        identity: this.#identity,
        resultingRevision: targetRevision,
      });
    } catch (error) {
      try { await this.#adapter.rollbackVisible(this.#staged); } catch { /* Preserve apply failure. */ }
      try {
        this.#contract.rollback({
          commitReceipt: null,
          identity: this.#identity,
          resultingRevision: this.#contract.snapshot().baseRevision,
        });
      } catch { /* A branded apply may already require an exact receipt. */ }
      throw error;
    }
  }

  async dispose() {
    const status = this.#contract.snapshot().status;
    if (status === 'applied') return this.#contract.dispose();
    if (status === 'prepared') await this.#adapter.rollbackVisible(this.#staged);
    return this.#contract.dispose();
  }

  finalize(commitReceipt) {
    const contractSnapshot = this.#contract.snapshot();
    requireMatchingPreparedCommitReceipt(commitReceipt, this.#contract);
    if (!this.#isCurrent()) {
      failChartApplication('CHART_APPLICATION_STALE', 'Chart preparation is stale.');
    }
    this.#state.requirePublishable(this.#identity, contractSnapshot.baseRevision);
    this.#adapter.finalizeVisible(this.#staged);
    this.#state.publish(
      this.#identity,
      this.#workspaceSnapshot,
      contractSnapshot.targetRevision,
      contractSnapshot.targetRevision,
    );
    return this.#contract.finalize({
      commitReceipt,
      identity: this.#identity,
      resultingRevision: contractSnapshot.targetRevision,
    });
  }

  async rollback(commitReceipt = null) {
    const contractSnapshot = this.#contract.snapshot();
    if (contractSnapshot.status === 'applied') {
      requireMatchingPreparedCommitReceipt(commitReceipt, this.#contract);
    }
    await this.#adapter.rollbackVisible(this.#staged);
    return this.#contract.rollback({
      commitReceipt,
      identity: this.#identity,
      resultingRevision: contractSnapshot.baseRevision,
    });
  }

  snapshot() {
    return this.#contract.snapshot();
  }
}

export function createPreparedChartApplication(options) {
  return new PreparedChartApplicationValue(options);
}

/** Reject structural lookalikes at the future transaction coordinator boundary. */
export function requirePreparedChartApplication(candidate) {
  if (!(candidate instanceof PreparedChartApplicationValue)) {
    failChartApplication(
      'PREPARED_CHART_APPLICATION_REQUIRED',
      'A branded prepared Chart application is required.',
    );
  }
  candidate.snapshot();
  return candidate;
}
