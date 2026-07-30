import { requireChartAdapter } from './port-contract.js';
import { createChartApplicationState } from './application-state.js';
import { failChartApplication } from './application-error.js';
import { requireProjectedPaneSetSnapshot } from './pane-set-snapshot-contract.js';
import { createPreparedChartApplication } from './prepared-chart-application.js';
import { requireProjectedPaneSnapshot } from './snapshot-contract.js';
import { createVisibleCompletionAcknowledgement } from './visible-completion.js';

async function safeRollback(adapter, staged) {
  if (staged === null) return;
  try {
    await adapter.rollbackVisible(staged);
  } catch {
    // Cleanup cannot replace the original transaction result.
  }
}

function createApplication({ activationGeneration, adapter, sessionId }, requireSnapshot) {
  const acceptedAdapter = requireChartAdapter(adapter);
  const state = createChartApplicationState({ activationGeneration, sessionId });

  async function prepare({ identity, workspaceSnapshot, signal }) {
    state.begin(identity);
    requireSnapshot(workspaceSnapshot, identity);
    if (!signal || typeof signal.aborted !== 'boolean') {
      failChartApplication('CHART_APPLICATION_SIGNAL_REQUIRED', 'An AbortSignal is required.');
    }
    const isCurrent = () => !signal.aborted && state.isCurrent(identity);
    let staged = null;
    try {
      staged = await acceptedAdapter.stage(Object.freeze({ identity, signal, workspaceSnapshot }));
      if (!isCurrent()) failChartApplication('CHART_APPLICATION_STALE', 'Transaction is stale.');
      return createPreparedChartApplication({
        adapter: acceptedAdapter,
        baseRevision: state.snapshot().revision,
        identity,
        isCurrent,
        signal,
        staged,
        state,
        workspaceSnapshot,
      });
    } catch (error) {
      await safeRollback(acceptedAdapter, staged);
      throw error;
    }
  }

  async function present(input) {
    const prepared = await prepare(input);
    let commitReceipt = null;
    try {
      commitReceipt = await prepared.apply();
      prepared.finalize(commitReceipt);
      return createVisibleCompletionAcknowledgement({
        identity: input.identity,
        workspaceSnapshot: input.workspaceSnapshot,
      });
    } catch (error) {
      try { await prepared.rollback(commitReceipt); } catch { /* Preserve transaction failure. */ }
      throw error;
    }
  }

  return Object.freeze({
    dispose: () => state.dispose(),
    prepare,
    present,
    snapshot: () => state.snapshot(),
  });
}

/** Construct the sole chart-series writer for one Pane in one Session activation. */
export function createChartSnapshotApplication(options) {
  return createApplication(options, requireProjectedPaneSnapshot);
}

/**
 * Construct the same sole-writer boundary for a complete Pane set.
 * The injected adapter must stage the complete set without visible mutation
 * and cross its visible boundary exactly once for all Pane results.
 */
export function createPaneSetChartSnapshotApplication(options) {
  return createApplication(options, requireProjectedPaneSetSnapshot);
}
