import { failManualWorkflow } from './workflow-error.js';

function requireAcceptedWorkspace(value) {
  if (!value || typeof value !== 'object' || !Object.isFrozen(value)
    || !Number.isSafeInteger(value.revision) || value.revision < 1
    || !value.replay || !Number.isSafeInteger(value.replay.cursorEpochMs)
    || !value.workspace || !Array.isArray(value.workspace.panes)) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_WORKSPACE_UNAVAILABLE',
      'Manual Annotation requires one accepted Workspace snapshot.',
    );
  }
  return value;
}

function readyPane(workspace, paneId) {
  const entry = workspace.workspace.panes.find((pane) => pane.paneId === paneId);
  if (!entry || entry.status !== 'ready' || !entry.snapshot
    || !Array.isArray(entry.snapshot.bars) || entry.snapshot.bars.length === 0) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_PANE_UNAVAILABLE',
      `Pane ${paneId} has no accepted Bar snapshot.`,
    );
  }
  return entry.snapshot;
}

function barEndEpochMs(bar, provenance, fallbackEndEpochMs = null) {
  if (Number.isSafeInteger(bar.endEpochMs) && bar.endEpochMs > bar.startEpochMs) {
    return bar.endEpochMs;
  }
  const durationMs = provenance.displayTimeframeDurationMs;
  if (Number.isSafeInteger(durationMs) && durationMs > 0) return bar.startEpochMs + durationMs;
  if (Number.isSafeInteger(fallbackEndEpochMs) && fallbackEndEpochMs > bar.startEpochMs) {
    return fallbackEndEpochMs;
  }
  failManualWorkflow(
    'MANUAL_WORKFLOW_BAR_END_UNAVAILABLE',
    'Exact Annotation evidence requires a closed Bar end.',
  );
}

function evidenceBar(bar, provenance) {
  return Object.freeze({
    close: bar.close,
    endEpochMs: barEndEpochMs(bar, provenance),
    high: bar.high,
    low: bar.low,
    open: bar.open,
    startEpochMs: bar.startEpochMs,
    volume: bar.volume,
  });
}

function artifactReference(artifact) {
  const observedAtReplayCutoffEpochMs = artifact?.provenance?.observedAtReplayCutoffEpochMs;
  if (typeof artifact?.artifactId !== 'string'
    || !Number.isSafeInteger(artifact.revision) || artifact.revision < 1
    || !Number.isSafeInteger(observedAtReplayCutoffEpochMs)
    || observedAtReplayCutoffEpochMs < 0) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_ARTIFACT_SNAPSHOT_INVALID',
      'Accepted Semantic Artifact evidence identity is invalid.',
    );
  }
  return Object.freeze({
    artifactId: artifact.artifactId,
    observedAtReplayCutoffEpochMs,
    revision: artifact.revision,
  });
}

/** Adapt one exact production Workspace publication to the pure Evidence owner. */
export function resolveManualToolEvidence({
  artifactReferences = [],
  artifacts,
  evidenceContract,
  requirement,
  selection,
  sessionId,
  workspace,
} = {}) {
  const accepted = requireAcceptedWorkspace(workspace);
  const pane = readyPane(accepted, selection.paneId);
  const provenance = pane.provenance;
  const snapshot = evidenceContract.createAcceptedAnnotationEvidenceSnapshot({
    acceptedWorkspaceRevision: accepted.revision,
    artifacts: artifacts.map(artifactReference),
    bars: pane.bars.map((bar) => evidenceBar(bar, provenance)),
    datasetRevision: provenance.datasetRevision,
    displayTimeframeId: provenance.displayTimeframeId,
    instrumentId: provenance.instrumentId,
    paneId: selection.paneId,
    replayCutoffEpochMs: accepted.replay.cursorEpochMs,
    schemaVersion: 1,
    sessionId,
    sourceTimeframeId: provenance.sourceResolutionId,
  });
  return evidenceContract.resolveAnnotationEvidence({
    requirement: evidenceContract.createAnnotationEvidenceRequirement(requirement),
    selection: evidenceContract.createAnnotationEvidenceSelection({
      artifactReferences,
      barStartEpochMs: selection.barStartEpochMs,
      schemaVersion: 1,
    }),
    snapshot,
  });
}

/** Build the exact current multi-Pane projection frame from accepted buckets only. */
export function createManualWorkflowProjectionFrame({
  annotationRevision,
  contextProjection,
  reconciliationRevision,
  sessionId,
  workspace,
} = {}) {
  const accepted = requireAcceptedWorkspace(workspace);
  return contextProjection.createAnnotationProjectionFrame({
    annotationRevision,
    panes: accepted.workspace.panes
      .filter(({ status }) => status === 'ready')
      .map(({ paneId, snapshot }) => ({
        acceptedBuckets: snapshot.bars.map((bar, index, bars) => ({
          endEpochMs: barEndEpochMs(
            bar,
            snapshot.provenance,
            bars[index + 1]?.startEpochMs ?? accepted.replay.cursorEpochMs,
          ),
          startEpochMs: bar.startEpochMs,
        })),
        instrumentId: snapshot.provenance.instrumentId,
        paneId,
        timeframeId: snapshot.provenance.displayTimeframeId,
      })),
    reconciliationRevision,
    replayCutoffEpochMs: accepted.replay.cursorEpochMs,
    sessionId,
  });
}

export function activePaneId(workspace) {
  const accepted = requireAcceptedWorkspace(workspace);
  const paneId = accepted.workspace.responsePlan?.activePaneId;
  readyPane(accepted, paneId);
  return paneId;
}

export function readAcceptedManualWorkspace(workspace) {
  return requireAcceptedWorkspace(workspace);
}
