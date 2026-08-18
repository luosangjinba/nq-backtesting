import { readCalculatedSeriesWorkspaceDocument } from '../calculated-series-contract/public.js';
import { brandDocumentWire, cloneDocumentWire } from './document-topology.js';
import { restoreCalculatedSeriesDocument } from './document-restore.js';
import { createCalculatedSeriesCommandController } from './command-controller.js';
import { reconcileCalculatedSeriesDocumentSettings } from './settings-resolution.js';
import { failCalculatedSeriesRuntime } from './runtime-error.js';
import { createCalculatedSeriesRuntimePublication } from './runtime-snapshot.js';
import {
  cancelCalculatedSeriesPaneTask,
  createCalculatedSeriesRuntimeState,
  readRuntimeProfileSnapshot,
  requireCalculatedSeriesChartPort,
  requireLiveRuntime,
} from './runtime-state.js';
import { createCalculatedSeriesWorkspaceController } from './workspace-controller.js';

async function persistRestoredDocument(state, document) {
  const prepared = state.storage.prepare({
    expectedRaw: state.knownRaw,
    payload: readCalculatedSeriesWorkspaceDocument(document),
    sessionId: state.scope.sessionToken,
  });
  const receipt = state.storage.apply(prepared);
  state.storage.finalize(prepared);
  state.knownRaw = receipt.raw;
}

async function initializeRuntime(state) {
  if (state.disposed || state.initialized) return state.publication.snapshot();
  state.status = 'initializing';
  const restoredBytes = state.storage.restore(state.scope.sessionToken);
  state.knownRaw = restoredBytes.raw;
  state.diagnostic = restoredBytes.diagnostic ?? null;
  const restored = await restoreCalculatedSeriesDocument({
    catalog: state.catalog,
    cryptoPort: state.cryptoPort,
    payload: restoredBytes.payload,
    sessionId: state.scope.sessionToken,
  });
  const restoredWire = cloneDocumentWire(restored.document);
  const settingsChanged = reconcileCalculatedSeriesDocumentSettings({
    catalog: state.catalog,
    profileSnapshot: readRuntimeProfileSnapshot(state),
    wire: restoredWire,
  });
  state.acceptedDocument = settingsChanged
    ? brandDocumentWire(restoredWire, state.catalog.definitions) : restored.document;
  state.diagnostic ??= restored.diagnostic;
  if ((restored.changed || settingsChanged) && state.diagnostic === null) {
    await persistRestoredDocument(state, state.acceptedDocument);
  }
  state.initialized = true;
  state.status = state.diagnostic === null ? 'ready' : 'error';
  return state.publication.publish();
}

function disposeRuntime(state) {
  if (state.disposed) return;
  state.disposed = true;
  state.activeController?.abort('disposed');
  for (const paneId of [...state.paneTasks.keys()]) {
    cancelCalculatedSeriesPaneTask(state, paneId, 'disposed');
  }
  state.listeners.clear();
  state.paneContexts.clear();
  state.status = 'disposed';
}

/** Own one Session's live calculated-series document, calculation state, and commands. */
export function createCalculatedSeriesRuntime(options = {}) {
  const state = createCalculatedSeriesRuntimeState(options);
  state.publication = createCalculatedSeriesRuntimePublication(state);
  const workspace = createCalculatedSeriesWorkspaceController(state);
  const execute = createCalculatedSeriesCommandController(state);
  return Object.freeze({
    acceptWorkspaceSurface: workspace.acceptWorkspaceSurface,
    bindChartPort(value) {
      if (state.boundChartPort !== null) {
        failCalculatedSeriesRuntime(
          'CALCULATED_SERIES_RUNTIME_CHART_PORT_BOUND',
          'Calculated-series Chart port may bind exactly once.',
        );
      }
      state.boundChartPort = requireCalculatedSeriesChartPort(value);
    },
    dispose: () => disposeRuntime(state),
    execute,
    initialize: () => initializeRuntime(state),
    prepareWorkspaceSurface: workspace.prepareWorkspaceSurface,
    prepareWorkspaceTransaction: workspace.prepareWorkspaceTransaction,
    readLegend(workspacePaneId, displayEpochMs = null) {
      requireLiveRuntime(state);
      return state.publication.snapshot(new Map([[workspacePaneId, displayEpochMs]])).panes
        .find((pane) => pane.workspacePaneId === workspacePaneId) ?? Object.freeze({
        instances: Object.freeze([]), unresolvedInstances: Object.freeze([]), workspacePaneId,
      });
    },
    rollbackWorkspaceSurface: workspace.rollbackWorkspaceSurface,
    snapshot: state.publication.snapshot,
    subscribe(listener) {
      requireLiveRuntime(state);
      if (typeof listener !== 'function') throw new TypeError('Calculated-series listener is invalid.');
      state.listeners.add(listener);
      listener(state.publication.snapshot());
      return Object.freeze({ unsubscribe: () => state.listeners.delete(listener) });
    },
  });
}
