import { createRuntimePaneSurfaceCandidate } from './surface-candidate.js';

async function rollbackPreparedChart(preparation, receipt) {
  if (preparation === null) return;
  try {
    if (receipt === null) await preparation.dispose();
    else await preparation.rollback(receipt);
  } catch { /* The Chart owner exposes any unproven recovery in its own snapshot. */ }
}

async function createSettlementSurface(state, paneId, context, deferredInstanceIds, signal) {
  const chart = state.boundChartPort.snapshot(paneId);
  const reuse = new Map(context.caches);
  for (const instanceId of deferredInstanceIds) reuse.delete(instanceId);
  return createRuntimePaneSurfaceCandidate({
    acceptedChartRevision: context.binding.acceptedChartRevision,
    baseSurfaceRevision: chart.acceptedSurfaceRevision,
    catalog: state.catalog,
    cryptoPort: state.cryptoPort,
    document: state.acceptedDocument,
    execution: state.executor,
    mode: 'same-snapshot-settlement',
    paneSnapshot: context.paneSnapshot,
    profileSnapshot: state.readProfileSnapshot(),
    reuseByInstanceId: reuse,
    signal,
    synchronousBudgetMs: Number.POSITIVE_INFINITY,
    targetSurfaceRevision: chart.acceptedSurfaceRevision + 1,
    transactionIdentity: context.transactionIdentity,
    workspacePaneId: paneId,
    workspaceStateRevision: context.workspaceStateRevision,
  });
}

async function runSettlement(state, paneId, context, deferredInstanceIds, controller) {
  let preparation = null;
  let receipt = null;
  let decisionCommitted = false;
  try {
    if (state.disposed || controller.signal.aborted || state.paneContexts.get(paneId) !== context) return;
    const surface = await createSettlementSurface(
      state, paneId, context, deferredInstanceIds, controller.signal,
    );
    if (state.disposed || controller.signal.aborted || state.paneContexts.get(paneId) !== context) return;
    preparation = await state.boundChartPort.prepare(paneId, surface.candidate);
    receipt = await preparation.apply();
    if (state.disposed || controller.signal.aborted || state.paneContexts.get(paneId) !== context) {
      await preparation.rollback(receipt);
      return;
    }
    decisionCommitted = true;
    await preparation.finalize(receipt);
    state.paneContexts.set(paneId, Object.freeze({ ...context, caches: surface.caches }));
    state.calculationCount += surface.calculatedInstanceIds.length;
    state.status = 'ready';
    state.diagnostic = null;
    state.publication.publish();
  } catch (error) {
    if (!decisionCommitted) await rollbackPreparedChart(preparation, receipt);
    if (!controller.signal.aborted && !state.disposed
      && state.paneContexts.get(paneId) === context) {
      state.diagnostic = Object.freeze({
        code: decisionCommitted
          ? 'CALCULATED_SERIES_RUNTIME_SETTLEMENT_FINALIZE_UNPROVEN'
          : error?.code ?? 'CALCULATED_SERIES_RUNTIME_SETTLEMENT_FAILED',
        message: decisionCommitted
          ? 'Deferred Indicator state committed, but Chart cleanup could not be proven.'
          : 'Deferred Indicator settlement failed without publishing stale points.',
      });
      state.status = 'error';
      state.publication.publish();
    }
  }
}

/** Schedule one cancellable same-snapshot replacement for budget-deferred frames. */
export function scheduleCalculatedSeriesDeferredSettlement(
  state, paneId, context, deferredInstanceIds,
) {
  if (deferredInstanceIds.length === 0 || state.boundChartPort === null) return;
  const controller = new AbortController();
  const task = { controller, handle: null };
  state.paneTasks.set(paneId, task);
  task.handle = state.scheduleTask(async () => {
    try { await runSettlement(state, paneId, context, deferredInstanceIds, controller); }
    finally { if (state.paneTasks.get(paneId) === task) state.paneTasks.delete(paneId); }
  });
}
