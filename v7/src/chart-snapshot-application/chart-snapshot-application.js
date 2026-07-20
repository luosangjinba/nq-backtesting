import { requireChartAdapter } from './port-contract.js';
import { createChartApplicationState } from './application-state.js';
import { failChartApplication } from './application-error.js';
import { requireMatchingAdapterReceipt } from './adapter-receipt.js';
import { requireProjectedPaneSnapshot } from './snapshot-contract.js';
import { createVisibleCompletionAcknowledgement } from './visible-completion.js';

async function safeDiscard(adapter, staged) {
  if (staged === null) return;
  try {
    await adapter.discard(staged);
  } catch {
    // Cleanup cannot replace the original transaction result.
  }
}

/** Construct the sole chart-series writer for one Session activation. */
export function createChartSnapshotApplication({ activationGeneration, adapter, sessionId }) {
  const acceptedAdapter = requireChartAdapter(adapter);
  const state = createChartApplicationState({ activationGeneration, sessionId });

  async function present({ identity, workspaceSnapshot, signal }) {
    state.begin(identity);
    requireProjectedPaneSnapshot(workspaceSnapshot, identity);
    if (!signal || typeof signal.aborted !== 'boolean') {
      failChartApplication('CHART_APPLICATION_SIGNAL_REQUIRED', 'An AbortSignal is required.');
    }
    const isCurrent = () => !signal.aborted && state.isCurrent(identity);
    let staged = null;
    try {
      staged = await acceptedAdapter.stage(Object.freeze({ identity, signal, workspaceSnapshot }));
      if (!isCurrent()) failChartApplication('CHART_APPLICATION_STALE', 'Transaction is stale.');
      const receipt = await acceptedAdapter.applyVisible(Object.freeze({
        identity,
        isCurrent,
        signal,
        staged,
        workspaceSnapshot,
      }));
      if (!isCurrent()) failChartApplication('CHART_APPLICATION_STALE', 'Transaction is stale.');
      const previousRevision = state.snapshot().acceptedSnapshot?.adapterRevision ?? 0;
      const value = requireMatchingAdapterReceipt(
        receipt,
        { identity, workspaceSnapshot },
        previousRevision,
      );
      state.publish(identity, workspaceSnapshot, value.adapterRevision);
      return createVisibleCompletionAcknowledgement({ identity, workspaceSnapshot });
    } catch (error) {
      await safeDiscard(acceptedAdapter, staged);
      throw error;
    }
  }

  return Object.freeze({ dispose: () => state.dispose(), present, snapshot: () => state.snapshot() });
}
