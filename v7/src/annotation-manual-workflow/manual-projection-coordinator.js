import { createManualWorkflowProjectionFrame } from './accepted-workspace-evidence.js';
import { createMultiPaneSemanticPreviewPort } from './multi-pane-preview-port.js';
import { failManualWorkflow } from './workflow-error.js';

/** Own accepted/Preview multi-Pane reconciliation and bounded Chart surface subscriptions. */
export function createManualProjectionCoordinator({
  chartProjection,
  chartSurfacePort,
  contextProjection,
  geometryContract,
  onArtifactSelection,
  readDocument,
  readWorkspace,
  semanticRegistry,
  sessionId,
  shouldSelectArtifact,
} = {}) {
  const policyRegistry = contextProjection.createInitialAnchorProjectionPolicyRegistry();
  const runtime = contextProjection.createMultiPaneAnnotationProjectionRuntime({
    createProjection: chartProjection.createAnnotationProjection,
    geometryContract,
    policyRegistry,
  });
  const subscriptions = new Map();
  let reconciliationRevision = 0;

  function surfaces() { return chartSurfacePort.annotationSurfaces(chartProjection); }

  function frame() {
    const document = readDocument();
    const workspace = readWorkspace();
    if (document === null || workspace === null) {
      failManualWorkflow(
        'MANUAL_WORKFLOW_CONTEXT_UNAVAILABLE',
        'Annotation projection requires accepted Runtime and Workspace state.',
      );
    }
    return createManualWorkflowProjectionFrame({
      annotationRevision: document.revision,
      contextProjection,
      reconciliationRevision: ++reconciliationRevision,
      sessionId,
      workspace,
    });
  }

  function subjects(excludedArtifactId) {
    const document = readDocument();
    if (document === null) return Object.freeze([]);
    return Object.freeze(document.artifacts
      .filter(({ artifactId }) => artifactId !== excludedArtifactId)
      .flatMap((artifact) => semanticRegistry.projectionInputsForArtifact(artifact))
      .map(contextProjection.createAnnotationProjectionSubject));
  }

  function syncSubscriptions(activeSurfaces) {
    const active = new Set(activeSurfaces);
    for (const [surface, subscription] of subscriptions) {
      if (active.has(surface)) continue;
      subscription.unsubscribe();
      subscriptions.delete(surface);
    }
    for (const surface of activeSurfaces) {
      if (subscriptions.has(surface)) continue;
      subscriptions.set(surface, surface.interactionPort.subscribeSelection(({ hit }) => {
        if (hit !== null && shouldSelectArtifact()) onArtifactSelection(hit.entityId);
      }));
    }
  }

  const previewPort = createMultiPaneSemanticPreviewPort({
    chartProjection,
    contextProjection,
    createFrame: frame,
    geometryContract,
    listSurfaces: surfaces,
    policyRegistry,
  });

  return Object.freeze({
    async dispose() {
      for (const subscription of subscriptions.values()) subscription.unsubscribe();
      subscriptions.clear();
      await previewPort.dispose();
      await runtime.dispose();
      await Promise.allSettled(surfaces().map((surface) => surface.dispose()));
    },
    previewPort,
    reconcile(excludedArtifactId = null) {
      const activeSurfaces = surfaces();
      syncSubscriptions(activeSurfaces);
      return runtime.reconcile({
        frame: frame(),
        subjects: subjects(excludedArtifactId),
        surfaces: activeSurfaces.map(({ acceptedPort, paneId }) => ({ paneId, port: acceptedPort })),
      });
    },
    snapshot: runtime.snapshot,
  });
}
