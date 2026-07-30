import {
  readWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import { failChartApplication } from './application-error.js';

class AdapterVisibleReceiptValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

export function createChartAdapterVisibleReceipt({ adapterRevision, identity, workspaceSnapshot }) {
  readWorkspaceTransactionIdentity(identity);
  if (!Number.isSafeInteger(adapterRevision) || adapterRevision < 1) {
    failChartApplication('CHART_ADAPTER_REVISION_INVALID', 'Adapter revision must be positive.');
  }
  if (!workspaceSnapshot || !Object.isFrozen(workspaceSnapshot)) {
    failChartApplication('CHART_ADAPTER_SNAPSHOT_IMMUTABLE', 'Adapter snapshot must be frozen.');
  }
  return new AdapterVisibleReceiptValue({ adapterRevision, identity, workspaceSnapshot });
}

export function requireMatchingAdapterReceipt(candidate, expected, targetRevision) {
  if (!(candidate instanceof AdapterVisibleReceiptValue)) {
    failChartApplication('CHART_ADAPTER_RECEIPT_REQUIRED', 'A branded adapter receipt is required.');
  }
  const value = candidate.read();
  if (!workspaceTransactionIdentitiesEqual(value.identity, expected.identity)) {
    failChartApplication('CHART_ADAPTER_RECEIPT_IDENTITY', 'Adapter receipt identity does not match.');
  }
  if (value.workspaceSnapshot !== expected.workspaceSnapshot) {
    failChartApplication('CHART_ADAPTER_RECEIPT_SNAPSHOT', 'Adapter receipt snapshot does not match.');
  }
  if (value.adapterRevision !== targetRevision) {
    failChartApplication(
      'CHART_ADAPTER_REVISION_INVALID',
      `Adapter revision must equal prepared target revision ${targetRevision}.`,
    );
  }
  return value;
}
