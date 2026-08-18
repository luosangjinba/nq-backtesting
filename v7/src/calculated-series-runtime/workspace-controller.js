import { readCalculatedSeriesWorkspaceDocument } from '../calculated-series-contract/public.js';
import { brandDocumentWire, cloneDocumentWire } from './document-topology.js';
import { scheduleCalculatedSeriesDeferredSettlement } from './deferred-settlement.js';
import { failCalculatedSeriesRuntime } from './runtime-error.js';
import {
  cancelCalculatedSeriesPaneTask,
  readRuntimeProfileSnapshot,
  requireLiveRuntime,
} from './runtime-state.js';
import { createRuntimePaneSurfaceCandidate } from './surface-candidate.js';
import { createCalculatedSeriesWorkspaceDocumentPreparation } from './workspace-document-preparation.js';

function workspaceDocumentCandidate(state, identity, workspaceSnapshot) {
  const visiblePaneIds = new Set(workspaceSnapshot.panes.map(({ paneId }) => paneId));
  const wire = cloneDocumentWire(state.acceptedDocument);
  const removedPaneIds = wire.workspacePanes
    .filter(({ workspacePaneId }) => !visiblePaneIds.has(workspacePaneId))
    .map(({ workspacePaneId }) => workspacePaneId);
  if (removedPaneIds.length > 0) {
    wire.workspacePanes = wire.workspacePanes
      .filter(({ workspacePaneId }) => visiblePaneIds.has(workspacePaneId));
    wire.documentRevision += 1;
  }
  const document = brandDocumentWire(wire, state.catalog.definitions);
  const persistencePreparation = removedPaneIds.length === 0 ? null : state.storage.prepare({
    expectedRaw: state.knownRaw,
    payload: readCalculatedSeriesWorkspaceDocument(document),
    sessionId: state.scope.sessionToken,
  });
  const record = Object.freeze({ document, removedPaneIds: Object.freeze(removedPaneIds) });
  state.workspaceDocumentCandidates.set(identity, record);
  return Object.freeze({ document, persistencePreparation, record });
}

function finalizeWorkspaceDocument(state, identity, candidate, receipt) {
  state.acceptedDocument = candidate.document;
  if (receipt !== null) state.knownRaw = receipt.raw;
  for (const paneId of candidate.record.removedPaneIds) {
    cancelCalculatedSeriesPaneTask(state, paneId, 'pane-removed');
    state.paneContexts.delete(paneId);
  }
  state.workspaceDocumentCandidates.delete(identity);
  state.publication.publish();
}

/** Own Workspace and Chart-surface participation around the accepted document. */
export function createCalculatedSeriesWorkspaceController(state) {
  async function prepareWorkspaceSurface(input) {
    requireLiveRuntime(state);
    const surface = await createRuntimePaneSurfaceCandidate({
      ...input,
      catalog: state.catalog,
      cryptoPort: state.cryptoPort,
      document: state.workspaceDocumentCandidates.get(input.transactionIdentity)?.document
        ?? state.acceptedDocument,
      execution: state.executor,
      mode: 'workspace-stage',
      profileSnapshot: readRuntimeProfileSnapshot(state),
    });
    const token = Object.freeze({});
    state.workspacePreparations.set(token, { input, surface, state: 'prepared' });
    return Object.freeze({ candidate: surface?.candidate ?? null, token });
  }

  function prepareWorkspaceTransaction({ identity, workspaceSnapshot } = {}) {
    requireLiveRuntime(state);
    if (!identity || !workspaceSnapshot || !Array.isArray(workspaceSnapshot.panes)) {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_WORKSPACE_INPUT_INVALID',
        'Calculated-series Workspace preparation requires identity and a complete Pane set.',
      );
    }
    const candidate = workspaceDocumentCandidate(state, identity, workspaceSnapshot);
    return createCalculatedSeriesWorkspaceDocumentPreparation({
      identity,
      onFinalize: (receipt) => finalizeWorkspaceDocument(state, identity, candidate, receipt),
      onRollback() { state.workspaceDocumentCandidates.delete(identity); },
      persistence: state.storage,
      persistencePreparation: candidate.persistencePreparation,
    });
  }

  function settleWorkspaceSurface(token, accepted) {
    const record = state.workspacePreparations.get(token);
    if (!record || record.state !== 'prepared') {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_PREPARATION_STALE',
        'Workspace surface preparation is missing or already settled.',
      );
    }
    record.state = accepted ? 'accepted' : 'rolled-back';
    state.workspacePreparations.delete(token);
    if (!accepted) return;
    const { input, surface } = record;
    cancelCalculatedSeriesPaneTask(state, input.workspacePaneId, 'workspace-replaced');
    const context = Object.freeze({
      acceptedChartRevision: input.targetChartRevision,
      binding: surface?.binding ?? null,
      caches: surface?.caches ?? new Map(),
      paneSnapshot: surface?.paneSnapshot ?? input.paneSnapshot,
      transactionIdentity: input.transactionIdentity,
      workspaceStateRevision: input.workspaceStateRevision,
    });
    state.paneContexts.set(input.workspacePaneId, context);
    state.calculationCount += surface?.calculatedInstanceIds.length ?? 0;
    state.publication.publish();
    if (surface !== null) {
      scheduleCalculatedSeriesDeferredSettlement(
        state, input.workspacePaneId, context, surface.deferredInstanceIds,
      );
    }
  }

  return Object.freeze({
    acceptWorkspaceSurface: (token) => settleWorkspaceSurface(token, true),
    prepareWorkspaceSurface,
    prepareWorkspaceTransaction,
    rollbackWorkspaceSurface: (token) => settleWorkspaceSurface(token, false),
  });
}
