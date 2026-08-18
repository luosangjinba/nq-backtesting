import { failCalculatedSeriesRuntime } from './runtime-error.js';

class WorkspaceDocumentReceiptValue {
  #owner;
  constructor(owner) { this.#owner = owner; Object.freeze(this); }
  matches(owner) { return this.#owner === owner; }
}

/** Wrap one document/sidecar candidate in the global prepared-participant lifecycle. */
export function createCalculatedSeriesWorkspaceDocumentPreparation({
  identity,
  onFinalize,
  onRollback,
  persistence,
  persistencePreparation,
}) {
  const owner = Object.freeze({});
  let persistenceReceipt = null;
  let state = 'prepared';

  function requireReceipt(receipt) {
    if (!(receipt instanceof WorkspaceDocumentReceiptValue) || !receipt.matches(owner)) {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_WORKSPACE_RECEIPT_INVALID',
        'Calculated-series Workspace receipt is missing or foreign.',
      );
    }
  }

  function rollback(receipt = null) {
    if (state === 'rolled-back') return;
    if (state === 'finalized') {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_WORKSPACE_PHASE_INVALID',
        'A finalized calculated-series Workspace document cannot roll back.',
      );
    }
    if (state === 'applied') requireReceipt(receipt);
    if (persistencePreparation !== null) persistence.rollback(persistencePreparation);
    state = 'rolled-back';
    onRollback();
  }

  return Object.freeze({
    apply() {
      if (state !== 'prepared') {
        failCalculatedSeriesRuntime(
          'CALCULATED_SERIES_RUNTIME_WORKSPACE_PHASE_INVALID',
          'Only a prepared calculated-series Workspace document may apply.',
        );
      }
      if (persistencePreparation !== null) {
        persistenceReceipt = persistence.apply(persistencePreparation);
      }
      state = 'applied';
      return new WorkspaceDocumentReceiptValue(owner);
    },
    dispose() { if (state === 'prepared') rollback(); },
    finalize(receipt) {
      if (state !== 'applied') {
        failCalculatedSeriesRuntime(
          'CALCULATED_SERIES_RUNTIME_WORKSPACE_PHASE_INVALID',
          'Only an applied calculated-series Workspace document may finalize.',
        );
      }
      requireReceipt(receipt);
      if (persistencePreparation !== null) persistence.finalize(persistencePreparation);
      state = 'finalized';
      onFinalize(persistenceReceipt);
    },
    rollback,
    snapshot: () => Object.freeze({
      identity,
      participant: 'calculated-series-document',
      status: state,
    }),
  });
}
