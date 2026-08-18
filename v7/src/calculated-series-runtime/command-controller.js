import { readCalculatedSeriesWorkspaceDocument } from '../calculated-series-contract/public.js';
import { brandDocumentWire, cloneDocumentWire } from './document-topology.js';
import {
  mutateCalculatedSeriesDocument,
  requireCalculatedSeriesCommand,
} from './instance-mutations.js';
import { failCalculatedSeriesRuntime } from './runtime-error.js';
import {
  nextCalculatedSeriesTransactionIdentity,
  readRuntimeProfileSnapshot,
  requireLiveRuntime,
} from './runtime-state.js';
import { createRuntimePaneSurfaceCandidate } from './surface-candidate.js';

function registrationForCommand(state, command, wire) {
  if (command.kind === 'add-instance') {
    const registration = state.catalog.resolve(command.definitionRef);
    if (registration === null) {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_DEFINITION_UNKNOWN',
        'Selected calculated-series Definition is unavailable.',
      );
    }
    return registration;
  }
  const pane = wire.workspacePanes.find(({ workspacePaneId }) => (
    workspacePaneId === command.workspacePaneId
  ));
  const instance = pane?.resolvedInstances.find(({ instanceId }) => instanceId === command.instanceId);
  const registration = instance ? state.catalog.resolve(instance.definitionRef) : null;
  const removingUnresolved = command.kind === 'remove-instance' && registration === null
    && pane?.unresolvedInstances.some(({ instanceId }) => instanceId === command.instanceId);
  if (removingUnresolved) return null;
  if (registration === null) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_DEFINITION_UNKNOWN',
      'Instance Definition is unavailable.',
    );
  }
  return registration;
}

async function commandSurface(state, nextDocument, context, identity, mutation, signal) {
  const chart = state.boundChartPort.snapshot(mutation.paneId);
  const reuse = new Map(context.caches);
  if (mutation.recalculate || mutation.removed) reuse.delete(mutation.instance.instanceId);
  return createRuntimePaneSurfaceCandidate({
    acceptedChartRevision: chart.acceptedChartRevision,
    baseSurfaceRevision: chart.acceptedSurfaceRevision,
    catalog: state.catalog,
    cryptoPort: state.cryptoPort,
    document: nextDocument,
    execution: state.executor,
    mode: 'workspace-stage',
    paneSnapshot: context.paneSnapshot,
    profileSnapshot: readRuntimeProfileSnapshot(state),
    reuseByInstanceId: reuse,
    signal,
    targetSurfaceRevision: chart.acceptedSurfaceRevision + 1,
    transactionIdentity: identity,
    workspacePaneId: mutation.paneId,
    workspaceStateRevision: context.workspaceStateRevision,
  });
}

async function prepareCommand(state, command, signal) {
  const previousDocument = state.acceptedDocument;
  const wire = cloneDocumentWire(previousDocument);
  const registration = registrationForCommand(state, command, wire);
  const mutation = mutateCalculatedSeriesDocument({
    command,
    idFactory: () => `indicator-${state.idFactory()}`,
    profileSnapshot: readRuntimeProfileSnapshot(state),
    registration,
    wire,
  });
  const nextDocument = brandDocumentWire(wire, state.catalog.definitions);
  const context = state.paneContexts.get(mutation.paneId);
  if (!context) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_PANE_NOT_READY',
      'The target Pane has no accepted calculated-series Chart binding.',
    );
  }
  const identity = nextCalculatedSeriesTransactionIdentity(state);
  const surface = await commandSurface(state, nextDocument, context, identity, mutation, signal);
  const persistencePreparation = state.storage.prepare({
    expectedRaw: state.knownRaw,
    payload: readCalculatedSeriesWorkspaceDocument(nextDocument),
    sessionId: state.scope.sessionToken,
  });
  let chartPreparation;
  try { chartPreparation = await state.boundChartPort.prepare(mutation.paneId, surface.candidate); }
  catch (error) { state.storage.rollback(persistencePreparation); throw error; }
  return {
    chartPreparation, context, mutation, nextDocument, persistencePreparation,
    previousDocument, surface,
  };
}

async function rollbackCommand(state, plan, chartReceipt, persistenceApplied) {
  if (plan.chartPreparation && chartReceipt) {
    try { await plan.chartPreparation.rollback(chartReceipt); } catch { /* Preserve first failure. */ }
  } else if (plan.chartPreparation) {
    try { await plan.chartPreparation.dispose(); } catch { /* Preserve first failure. */ }
  }
  try { state.storage.rollback(plan.persistencePreparation); } catch {
    if (persistenceApplied) {
      state.diagnostic = Object.freeze({
        code: 'CALCULATED_SERIES_RUNTIME_ROLLBACK_UNPROVEN',
        message: 'Calculated-series command rollback could not restore prior bytes.',
      });
    }
  }
  state.acceptedDocument = plan.previousDocument;
  state.status = state.diagnostic === null ? 'ready' : 'error';
}

function publishAcceptedPlan(state, plan, persistenceReceipt) {
  state.acceptedDocument = plan.nextDocument;
  state.knownRaw = persistenceReceipt.raw;
  const caches = new Map(plan.context.caches);
  if (plan.mutation.removed || plan.mutation.recalculate) {
    caches.delete(plan.mutation.instance.instanceId);
  }
  for (const [instanceId, cache] of plan.surface.caches) caches.set(instanceId, cache);
  state.paneContexts.set(plan.mutation.paneId, Object.freeze({
    ...plan.context,
    binding: plan.surface.binding,
    caches,
  }));
  state.calculationCount += plan.surface.calculatedInstanceIds.length;
}

async function applyCommand(state, plan) {
  let chartReceipt = null;
  let persistenceApplied = false;
  let decisionCommitted = false;
  try {
    const persistenceReceipt = state.storage.apply(plan.persistencePreparation);
    persistenceApplied = true;
    chartReceipt = await plan.chartPreparation.apply();
    publishAcceptedPlan(state, plan, persistenceReceipt);
    state.storage.finalize(plan.persistencePreparation);
    decisionCommitted = true;
    await plan.chartPreparation.finalize(chartReceipt);
    state.status = 'ready';
    state.diagnostic = null;
    return state.publication.snapshot();
  } catch (error) {
    if (decisionCommitted) {
      state.diagnostic = Object.freeze({
        code: 'CALCULATED_SERIES_RUNTIME_CHART_FINALIZE_UNPROVEN',
        message: 'Indicator state committed, but Chart cleanup could not be proven.',
      });
      state.status = 'error';
    } else {
      await rollbackCommand(state, plan, chartReceipt, persistenceApplied);
    }
    throw error;
  }
}

/** Execute strict instance commands through reversible sidecar and Chart transactions. */
export function createCalculatedSeriesCommandController(state) {
  return async function execute(command) {
    requireLiveRuntime(state);
    requireCalculatedSeriesCommand(command);
    if (state.diagnostic !== null) {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_RECOVERY_REQUIRED',
        'Persisted calculated-series state must be recovered before editing.',
      );
    }
    if (state.busy) {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_BUSY',
        'Wait for the current calculated-series command to finish.',
      );
    }
    if (state.boundChartPort === null) {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_CHART_UNAVAILABLE',
        'Calculated-series Chart admission is unavailable.',
      );
    }
    state.busy = true;
    state.status = 'updating';
    state.activeController = new AbortController();
    state.publication.publish();
    try {
      const plan = await prepareCommand(state, command, state.activeController.signal);
      return await applyCommand(state, plan);
    } finally {
      state.activeController = null;
      state.busy = false;
      state.publication.publish();
    }
  };
}
