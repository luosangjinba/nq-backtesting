import * as chartProjection from '../annotation-chart-projection/public.js';
import * as contextProjection from '../annotation-context-projection/public.js';
import * as evidenceContract from '../annotation-evidence-resolver/public.js';
import * as geometryContract from '../annotation-geometry-domain/public.js';
import { createAnnotationStorageAdapter, createDurableAnnotationRepository } from '../annotation-persistence/public.js';
import { createSemanticPackageRegistry } from '../annotation-semantic-registry/public.js';
import { createFairValueGapSemanticPackage, FAIR_VALUE_GAP_PACKAGE_ID, FAIR_VALUE_GAP_PLUGIN_MANIFEST } from '../semantic-fair-value-gap/public.js';
import { readAcceptedManualWorkspace } from './accepted-workspace-evidence.js';
import { constructManualSemanticArtifact } from './manual-artifact-construction.js';
import { createManualProjectionCoordinator } from './manual-projection-coordinator.js';
import { armManualSemanticTool } from './manual-tool-picker.js';
import { requireManualWorkflowOptions } from './manual-workflow-options.js';
import { startManualWorkflowOwners } from './manual-workflow-start.js';
import { createProductionSemanticToolCatalog } from './semantic-tool-catalog.js';
import { failManualWorkflow, stableManualWorkflowError } from './workflow-error.js';
import { createManualWorkflowViewModel, emptyInspectorSnapshot } from './workflow-view-model.js';

/**
 * Compose the production contribution -> Picker -> Evidence -> Artifact ->
 * Inspector -> multi-Pane projection path without acquiring any owner-internal handle.
 */
export function createProductionManualAnnotationWorkflow(input = {}) {
  const options = requireManualWorkflowOptions(input);
  const catalog = createProductionSemanticToolCatalog({
    manifests: [FAIR_VALUE_GAP_PLUGIN_MANIFEST], moduleDescriptors: options.moduleDescriptors,
  });
  const semanticRegistry = createSemanticPackageRegistry({
    availableCapabilities: [
      'annotation.evidence.bundle',
      'annotation.geometry.rectangle',
      'annotation.geometry.segment',
    ],
    packages: [createFairValueGapSemanticPackage({ evidenceContract, geometryContract })],
  });
  const repository = createDurableAnnotationRepository({
    namespace: 'v7.annotation-history', storage: createAnnotationStorageAdapter(options.storage),
  });
  let activeToolId = null, disposed = false, error = null, inspector = null;
  let inspectorActions = null, picker = null, runtime = null, status = 'created';
  let tools = Object.freeze([]), workspace = null, workspaceSequence = 0;
  let workspaceTail = Promise.resolve();
  const projection = createManualProjectionCoordinator({
    chartProjection, chartSurfacePort: options.chartSurfacePort, contextProjection, geometryContract,
    onArtifactSelection: (artifactId) => { void selectArtifact(artifactId); },
    readDocument: () => runtime?.getDocument() ?? null,
    readWorkspace: () => workspace,
    semanticRegistry, sessionId: options.sessionId,
    shouldSelectArtifact: () => picker === null,
  });

  function inspectorSnapshot() { return inspector?.snapshot() ?? emptyInspectorSnapshot(); }

  function publish() {
    if (disposed) return;
    options.view.setAnnotationWorkflow(createManualWorkflowViewModel({
      activeToolId,
      error,
      inspector: inspectorSnapshot(),
      runtime,
      status,
      tools,
      workspaceReady: workspace !== null,
    }));
  }

  function recordError(cause, fallbackCode = 'MANUAL_WORKFLOW_OPERATION_FAILED') {
    error = stableManualWorkflowError(cause, fallbackCode);
    status = 'error';
    publish();
    return cause;
  }

  function settle(nextStatus) {
    status = nextStatus;
    error = null;
    publish();
  }

  function tool(toolId) {
    const selected = tools.find(({ id }) => id === toolId);
    if (!selected) failManualWorkflow('MANUAL_WORKFLOW_TOOL_UNKNOWN', `Tool ${toolId} is unavailable.`);
    if (selected.state !== 'active') {
      failManualWorkflow('MANUAL_WORKFLOW_TOOL_INACTIVE', `Tool ${toolId} is not active.`);
    }
    return selected;
  }

  async function reconcile({ excludeSelected = false } = {}) {
    const excluded = excludeSelected ? inspectorSnapshot().selectedArtifactId : null;
    return projection.reconcile(excluded);
  }

  async function selectArtifact(artifactId) {
    if (disposed || runtime === null || workspace === null || inspector === null) return null;
    try {
      error = null;
      const selected = await inspector.select({
        artifactId,
        replayCutoffEpochMs: workspace.replay.cursorEpochMs,
      });
      status = 'ready';
      publish();
      return selected;
    } catch (cause) {
      recordError(cause, 'MANUAL_WORKFLOW_INSPECTOR_SELECT_FAILED');
      return null;
    }
  }

  async function constructFromSelection(selectedTool, candidate) {
    status = 'constructing';
    error = null;
    publish();
    try {
      const artifactId = await constructManualSemanticArtifact({
        evidenceContract,
        idFactory: options.idFactory,
        nowEpochMs: options.nowEpochMs,
        runtime,
        selection: candidate,
        semanticRegistry,
        sessionId: options.sessionId,
        tool: selectedTool,
        workspace,
      });
      await reconcile();
      activeToolId = null;
      status = 'ready';
      await selectArtifact(artifactId);
      return artifactId;
    } catch (cause) {
      activeToolId = null;
      recordError(cause, 'MANUAL_WORKFLOW_CONSTRUCTION_FAILED');
      return null;
    } finally {
      picker?.dispose();
      picker = null;
      publish();
    }
  }

  async function updateWorkspace(candidate, sequence) {
    if (disposed || sequence !== workspaceSequence) return null;
    workspace = readAcceptedManualWorkspace(candidate);
    if (inspectorSnapshot().selectedArtifactId !== null && !inspectorSnapshot().dirty) {
      await inspector.select({
        artifactId: inspectorSnapshot().selectedArtifactId,
        replayCutoffEpochMs: workspace.replay.cursorEpochMs,
      });
    }
    await reconcile({ excludeSelected: inspectorSnapshot().dirty });
    status = inspectorSnapshot().dirty ? 'editing' : 'ready';
    error = null;
    publish();
    return snapshot();
  }

  function snapshot() {
    return Object.freeze({
      activeToolId,
      annotationDocumentRevision: runtime?.getDocument().revision ?? null,
      error,
      inspector: inspectorSnapshot(),
      package: semanticRegistry.packageSnapshot(FAIR_VALUE_GAP_PACKAGE_ID),
      projection: projection.snapshot(),
      status,
      toolIds: Object.freeze(tools.map(({ id }) => id)),
      workspaceRevision: workspace?.revision ?? null,
    });
  }

  return Object.freeze({
    acceptWorkspace(candidate) {
      const sequence = ++workspaceSequence;
      workspace = readAcceptedManualWorkspace(candidate);
      workspaceTail = workspaceTail.catch(() => null).then(() => updateWorkspace(candidate, sequence))
        .catch((cause) => { recordError(cause, 'MANUAL_WORKFLOW_RECONCILIATION_FAILED'); });
      return workspaceTail;
    },
    applyInspector: () => inspectorActions?.apply() ?? null,
    cancelInspector: () => inspectorActions?.cancel() ?? null,
    async dispose() {
      if (disposed) return;
      disposed = true;
      workspaceSequence += 1;
      picker?.dispose();
      picker = null;
      await workspaceTail.catch(() => null);
      await inspector?.dispose();
      await projection.dispose();
      await runtime?.dispose();
      await semanticRegistry.dispose();
      activeToolId = null;
      status = 'disposed';
    },
    resetInspector: () => inspectorActions?.reset() ?? null,
    snapshot,
    async start() {
      if (disposed || status !== 'created') {
        failManualWorkflow('MANUAL_WORKFLOW_LIFECYCLE_INVALID', 'Manual workflow cannot start now.');
      }
      status = 'starting';
      publish();
      try {
        const started = await startManualWorkflowOwners({
          catalog,
          chartProjection,
          geometryContract,
          nowEpochMs: options.nowEpochMs,
          onFailure: recordError,
          onInspectorError: (cause) => {
            error = stableManualWorkflowError(cause, 'MANUAL_WORKFLOW_INSPECTOR_FAILED');
          },
          onPublish: publish,
          onSettled: settle,
          onStatus(nextStatus) { status = nextStatus; publish(); },
          packageId: FAIR_VALUE_GAP_PACKAGE_ID,
          previewPort: projection.previewPort,
          readHostSnapshot: options.readModuleHostSnapshot,
          reconcile,
          repository,
          semanticRegistry,
          sessionId: options.sessionId,
        });
        ({ inspector, inspectorActions, runtime, tools } = started);
        status = 'ready';
        error = null;
        publish();
        return snapshot();
      } catch (cause) {
        recordError(cause, 'MANUAL_WORKFLOW_START_FAILED');
        throw cause;
      }
    },
    toggleTool(toolId) {
      if (disposed || !['ready', 'error'].includes(status) || runtime === null || workspace === null) {
        failManualWorkflow('MANUAL_WORKFLOW_NOT_READY', 'Manual Annotation tool is not ready.');
      }
      if (picker !== null) {
        picker.cancel('toolbar-toggle');
        picker.dispose();
        picker = null;
        activeToolId = null;
        status = 'ready';
        publish();
        return snapshot();
      }
      const selectedTool = tool(toolId);
      activeToolId = selectedTool.id;
      error = null;
      status = 'picking';
      picker = armManualSemanticTool({
        chartProjection,
        chartSurfacePort: options.chartSurfacePort,
        onError: (cause) => recordError(cause, 'MANUAL_WORKFLOW_PICKER_FAILED'),
        onSelection: (selection) => { void constructFromSelection(selectedTool, selection); },
        onStateChange: publish,
        tool: selectedTool,
        workspace,
      });
      publish();
      return snapshot();
    },
    updateInspectorField: (value) => inspectorActions?.update(value) ?? null,
  });
}
