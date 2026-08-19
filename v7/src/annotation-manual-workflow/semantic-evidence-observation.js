import { serializeSessionId } from '../session-identity/public.js';
import { failManualWorkflow } from './workflow-error.js';

function paneObservation(workspace, paneId) {
  const pane = workspace?.workspace?.panes?.find((entry) => entry.paneId === paneId);
  if (!pane || pane.status !== 'ready' || !Array.isArray(pane.snapshot?.bars)) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_PANE_UNAVAILABLE',
      `Pane ${paneId} has no accepted public snapshot.`,
    );
  }
  const provenance = pane.snapshot.provenance;
  const latest = [...pane.snapshot.bars].reverse().find(({ startEpochMs }) => (
    startEpochMs < workspace.replay.cursorEpochMs
  ));
  if (!latest) {
    failManualWorkflow('MANUAL_WORKFLOW_PANE_UNAVAILABLE', 'Pane has no no-future Bar.');
  }
  return Object.freeze({
    datasetRevision: provenance.datasetRevision,
    displayTimeframeId: provenance.displayTimeframeId,
    instrumentId: provenance.instrumentId,
    latestEligibleBarStartEpochMs: latest.startEpochMs,
    paneId,
    paneRevision: workspace.revision,
    providerId: provenance.providerId ?? 'foundation.market-data',
    sessionHoursPolicyId: provenance.sessionHoursPolicyId,
    sourceResolutionId: provenance.sourceResolutionId,
  });
}

/** Read one package-neutral, portable Semantic Artifact observation. */
export function readManualSemanticEvidenceObservation({
  artifactId,
  paneId,
  runtime,
  semanticRegistry,
  sessionId,
  sessionRevision,
  workspace,
}) {
  if (!runtime || !workspace) {
    failManualWorkflow('MANUAL_WORKFLOW_NOT_READY', 'Manual Annotation evidence is not ready.');
  }
  const artifact = runtime.getSemanticArtifact(artifactId);
  if (artifact === null) {
    failManualWorkflow('MANUAL_WORKFLOW_ARTIFACT_SNAPSHOT_INVALID', 'Semantic Artifact was not found.');
  }
  const document = runtime.getDocument();
  const packageSnapshot = semanticRegistry.packageSnapshot(artifact.definition.packageId);
  const pane = paneObservation(workspace, paneId);
  const packageEvidence = artifact.provenance.packageProvenance;
  const lowerPrice = artifact.attributes?.lowerPrice?.effectiveValue;
  const upperPrice = artifact.attributes?.upperPrice?.effectiveValue;
  return Object.freeze({
    artifact: Object.freeze({
      acceptance: packageSnapshot.state === 'active' ? 'accepted' : 'unresolved',
      definition: artifact.definition,
      direction: artifact.attributes?.direction,
      evidenceBarStartEpochMs: Object.freeze(
        (packageEvidence?.bars ?? []).map(({ reference }) => reference.startEpochMs),
      ),
      id: artifact.artifactId,
      lowerPrice,
      observedAtReplayCutoffEpochMs: artifact.provenance.observedAtReplayCutoffEpochMs,
      provenance: Object.freeze({
        acceptedWorkspaceRevision: packageEvidence?.acceptedWorkspaceRevision ?? null,
        datasetRevision: artifact.provenance.sourceBars?.[0]?.datasetRevision ?? null,
        recognitionSource: artifact.provenance.recognitionSource,
        sourceTimeframeId: artifact.provenance.sourceTimeframeId,
      }),
      revision: artifact.revision,
      status: artifact.status,
      typeId: artifact.typeId,
      typeVersion: artifact.typeVersion,
      upperPrice,
    }),
    document: Object.freeze({
      id: `annotation:${document.sessionId}`,
      revision: document.revision,
      schemaVersion: document.schemaVersion,
    }),
    package: packageSnapshot,
    pane,
    replay: Object.freeze({ exclusiveCutoffEpochMs: workspace.replay.cursorEpochMs }),
    session: Object.freeze({
      id: serializeSessionId(sessionId).value,
      revision: sessionRevision,
    }),
    workspace: Object.freeze({ revision: workspace.revision }),
  });
}

export function createManualSemanticEvidencePort(readState, selectEvidenceSource) {
  return Object.freeze({
    listEvidenceSources() {
      const { runtime } = readState();
      if (runtime === null) return Object.freeze([]);
      return Object.freeze(runtime.listSemanticArtifacts().map((artifact) => Object.freeze({
        artifactId: artifact.artifactId,
        direction: artifact.attributes?.direction ?? null,
        revision: artifact.revision,
        status: artifact.status,
        typeId: artifact.typeId,
        typeVersion: artifact.typeVersion,
      })).sort((left, right) => left.artifactId.localeCompare(right.artifactId)));
    },
    readEvidenceObservation({ artifactId, paneId } = {}) {
      const { options, runtime, semanticRegistry, workspace } = readState();
      return readManualSemanticEvidenceObservation({
        artifactId,
        paneId,
        runtime,
        semanticRegistry,
        sessionId: options.sessionId,
        sessionRevision: options.sessionRevision ?? 1,
        workspace,
      });
    },
    selectEvidenceSource,
  });
}
