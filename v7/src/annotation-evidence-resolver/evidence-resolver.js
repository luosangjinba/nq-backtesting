import { createAnnotationEvidenceBundle } from './evidence-bundle.js';
import { failEvidence } from './evidence-error.js';
import {
  readAnnotationEvidenceRequirement,
  readAnnotationEvidenceSelection,
} from './evidence-request.js';
import { readAcceptedAnnotationEvidenceSnapshot } from './evidence-snapshot.js';
import { exactRecord } from './evidence-validation.js';

function resolvedBar(snapshot, bar, relativeOffset) {
  if (bar.endEpochMs > snapshot.replayCutoffEpochMs) {
    failEvidence(
      'EVIDENCE_BAR_NOT_CLOSED',
      'Required Bar evidence is not closed at the accepted Replay cutoff.',
    );
  }
  return Object.freeze({
    reference: Object.freeze({
      datasetRevision: snapshot.datasetRevision,
      displayTimeframeId: snapshot.displayTimeframeId,
      endEpochMs: bar.endEpochMs,
      instrumentId: snapshot.instrumentId,
      observedAtReplayCutoffEpochMs: snapshot.replayCutoffEpochMs,
      sourceTimeframeId: snapshot.sourceTimeframeId,
      startEpochMs: bar.startEpochMs,
    }),
    relativeOffset,
    value: Object.freeze({
      close: bar.close,
      high: bar.high,
      low: bar.low,
      open: bar.open,
      volume: bar.volume,
    }),
  });
}

function resolvedArtifacts(snapshot, selection, requirement) {
  if (selection.artifactReferences.length > requirement.maximumArtifactReferences) {
    failEvidence('EVIDENCE_ARTIFACT_LIMIT_EXCEEDED', 'Selected Artifact evidence exceeds the declared limit.');
  }
  return Object.freeze(selection.artifactReferences.map((selected) => {
    const artifact = snapshot.artifacts.find(({ artifactId }) => artifactId === selected.artifactId);
    if (!artifact) {
      failEvidence('EVIDENCE_ARTIFACT_MISSING', 'Selected Artifact is absent from the accepted snapshot.');
    }
    if (artifact.revision !== selected.revision) {
      failEvidence('EVIDENCE_ARTIFACT_REVISION_MISMATCH', 'Selected Artifact revision is not exact.');
    }
    if (artifact.observedAtReplayCutoffEpochMs > snapshot.replayCutoffEpochMs) {
      failEvidence('EVIDENCE_ARTIFACT_FUTURE', 'Selected Artifact is not visible at the accepted Replay cutoff.');
    }
    return Object.freeze({ artifactId: artifact.artifactId, revision: artifact.revision });
  }));
}

/**
 * Resolve exact Bar and Artifact evidence from one supplied accepted snapshot.
 *
 * Protected invariant — no-future: a selected or neighboring Bar must be fully
 * closed, and an Artifact must already be observed, at the accepted Replay
 * cutoff. Missing evidence fails here; this pure owner has no Bar Data port.
 */
export function resolveAnnotationEvidence(value) {
  exactRecord(
    value,
    ['requirement', 'selection', 'snapshot'],
    'EVIDENCE_RESOLUTION_INVALID',
    'Evidence resolution input',
  );
  const { requirement, selection, snapshot } = value;
  const accepted = readAcceptedAnnotationEvidenceSnapshot(snapshot);
  const exactSelection = readAnnotationEvidenceSelection(selection);
  const boundedRequirement = readAnnotationEvidenceRequirement(requirement);
  const anchorIndex = accepted.bars.findIndex(
    ({ startEpochMs }) => startEpochMs === exactSelection.barStartEpochMs,
  );
  if (anchorIndex < 0) {
    failEvidence('EVIDENCE_SELECTED_BAR_MISSING', 'Selected Bar is absent from the accepted snapshot.');
  }
  const firstIndex = anchorIndex - boundedRequirement.precedingBars;
  const lastIndex = anchorIndex + boundedRequirement.followingBars;
  if (firstIndex < 0 || lastIndex >= accepted.bars.length) {
    failEvidence('EVIDENCE_NEIGHBOR_MISSING', 'Required neighboring Bar evidence is absent.');
  }
  const bars = Object.freeze(accepted.bars
    .slice(firstIndex, lastIndex + 1)
    .map((bar, index) => resolvedBar(accepted, bar, firstIndex + index - anchorIndex)));
  return createAnnotationEvidenceBundle({
    acceptedWorkspaceRevision: accepted.acceptedWorkspaceRevision,
    artifactReferences: resolvedArtifacts(accepted, exactSelection, boundedRequirement),
    bars,
    paneId: accepted.paneId,
    replayCutoffEpochMs: accepted.replayCutoffEpochMs,
    schemaVersion: 1,
    sessionId: accepted.sessionId,
  });
}
