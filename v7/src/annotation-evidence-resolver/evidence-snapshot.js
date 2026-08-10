import { requireSessionId } from '../session-identity/public.js';
import { failEvidence } from './evidence-error.js';
import {
  capabilityId,
  epoch,
  exactRecord,
  opaqueId,
} from './evidence-validation.js';

const SNAPSHOT_FIELDS = Object.freeze([
  'acceptedWorkspaceRevision', 'artifacts', 'bars', 'datasetRevision',
  'displayTimeframeId', 'instrumentId', 'paneId', 'replayCutoffEpochMs',
  'schemaVersion', 'sessionId', 'sourceTimeframeId',
]);
const BAR_FIELDS = Object.freeze([
  'close', 'endEpochMs', 'high', 'low', 'open', 'startEpochMs', 'volume',
]);
const ARTIFACT_FIELDS = Object.freeze([
  'artifactId', 'observedAtReplayCutoffEpochMs', 'revision',
]);
const MAX_BARS = 20_000;
const MAX_ARTIFACTS = 512;

class AcceptedAnnotationEvidenceSnapshotValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function finitePrice(value, field) {
  if (!Number.isFinite(value)) {
    failEvidence('EVIDENCE_SNAPSHOT_BAR_PRICE_INVALID', `Snapshot Bar ${field} must be finite.`);
  }
  return Object.is(value, -0) ? 0 : value;
}

function snapshotBar(value) {
  exactRecord(value, BAR_FIELDS, 'EVIDENCE_SNAPSHOT_BAR_INVALID', 'Snapshot Bar');
  const startEpochMs = epoch(
    value.startEpochMs,
    'EVIDENCE_SNAPSHOT_BAR_EPOCH_INVALID',
    'Snapshot Bar start',
  );
  const endEpochMs = epoch(
    value.endEpochMs,
    'EVIDENCE_SNAPSHOT_BAR_EPOCH_INVALID',
    'Snapshot Bar end',
  );
  const open = finitePrice(value.open, 'open');
  const high = finitePrice(value.high, 'high');
  const low = finitePrice(value.low, 'low');
  const close = finitePrice(value.close, 'close');
  if (startEpochMs >= endEpochMs || high < Math.max(open, low, close)
    || low > Math.min(open, high, close)
    || (value.volume !== null && (!Number.isFinite(value.volume) || value.volume < 0))) {
    failEvidence('EVIDENCE_SNAPSHOT_BAR_INVALID', 'Snapshot Bar range, envelope, or volume is invalid.');
  }
  return Object.freeze({
    close,
    endEpochMs,
    high,
    low,
    open,
    startEpochMs,
    volume: value.volume === null ? null : (Object.is(value.volume, -0) ? 0 : value.volume),
  });
}

function snapshotBars(values) {
  if (!Array.isArray(values) || values.length === 0 || values.length > MAX_BARS) {
    failEvidence('EVIDENCE_SNAPSHOT_BARS_INVALID', 'Snapshot Bars must contain 1 through 20,000 entries.');
  }
  const bars = Object.freeze(values.map(snapshotBar));
  for (let index = 1; index < bars.length; index += 1) {
    if (bars[index - 1].startEpochMs >= bars[index].startEpochMs
      || bars[index - 1].endEpochMs > bars[index].startEpochMs) {
      failEvidence('EVIDENCE_SNAPSHOT_BARS_NOT_ORDERED', 'Snapshot Bars must be ordered, unique, and non-overlapping.');
    }
  }
  return bars;
}

function snapshotArtifact(value) {
  exactRecord(value, ARTIFACT_FIELDS, 'EVIDENCE_SNAPSHOT_ARTIFACT_INVALID', 'Snapshot Artifact');
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) {
    failEvidence('EVIDENCE_SNAPSHOT_ARTIFACT_INVALID', 'Snapshot Artifact revision must be positive.');
  }
  return Object.freeze({
    artifactId: opaqueId(
      value.artifactId,
      'EVIDENCE_SNAPSHOT_ARTIFACT_INVALID',
      'Snapshot Artifact id',
    ),
    observedAtReplayCutoffEpochMs: epoch(
      value.observedAtReplayCutoffEpochMs,
      'EVIDENCE_SNAPSHOT_ARTIFACT_INVALID',
      'Snapshot Artifact observation cutoff',
    ),
    revision: value.revision,
  });
}

function snapshotArtifacts(values) {
  if (!Array.isArray(values) || values.length > MAX_ARTIFACTS) {
    failEvidence('EVIDENCE_SNAPSHOT_ARTIFACTS_INVALID', 'Snapshot Artifacts must be a bounded array.');
  }
  const artifacts = Object.freeze(values.map(snapshotArtifact));
  if (new Set(artifacts.map(({ artifactId }) => artifactId)).size !== artifacts.length) {
    failEvidence('EVIDENCE_SNAPSHOT_ARTIFACT_DUPLICATE', 'Snapshot Artifact ids must be unique.');
  }
  return artifacts;
}

function snapshotSessionId(candidate) {
  try {
    return requireSessionId(candidate);
  } catch (cause) {
    failEvidence(
      'EVIDENCE_SNAPSHOT_SESSION_INVALID',
      'Evidence snapshot requires a branded Session identity.',
      { cause },
    );
  }
}

/** Create one immutable owner-accepted Session/Workspace/Pane/Replay evidence snapshot. */
export function createAcceptedAnnotationEvidenceSnapshot(value) {
  exactRecord(value, SNAPSHOT_FIELDS, 'EVIDENCE_SNAPSHOT_INVALID', 'Evidence snapshot');
  if (value.schemaVersion !== 1
    || !Number.isSafeInteger(value.acceptedWorkspaceRevision)
    || value.acceptedWorkspaceRevision < 0) {
    failEvidence('EVIDENCE_SNAPSHOT_INVALID', 'Evidence snapshot version or Workspace revision is invalid.');
  }
  return new AcceptedAnnotationEvidenceSnapshotValue(Object.freeze({
    acceptedWorkspaceRevision: value.acceptedWorkspaceRevision,
    artifacts: snapshotArtifacts(value.artifacts),
    bars: snapshotBars(value.bars),
    datasetRevision: opaqueId(
      value.datasetRevision,
      'EVIDENCE_SNAPSHOT_DATASET_INVALID',
      'Dataset revision',
    ),
    displayTimeframeId: capabilityId(
      value.displayTimeframeId,
      'EVIDENCE_SNAPSHOT_TIMEFRAME_INVALID',
      'Display timeframe id',
    ),
    instrumentId: capabilityId(
      value.instrumentId,
      'EVIDENCE_SNAPSHOT_INSTRUMENT_INVALID',
      'Instrument id',
    ),
    paneId: opaqueId(value.paneId, 'EVIDENCE_SNAPSHOT_PANE_INVALID', 'Pane id'),
    replayCutoffEpochMs: epoch(
      value.replayCutoffEpochMs,
      'EVIDENCE_SNAPSHOT_CUTOFF_INVALID',
      'Replay cutoff',
    ),
    schemaVersion: 1,
    sessionId: snapshotSessionId(value.sessionId),
    sourceTimeframeId: capabilityId(
      value.sourceTimeframeId,
      'EVIDENCE_SNAPSHOT_TIMEFRAME_INVALID',
      'Source timeframe id',
    ),
  }));
}

export function readAcceptedAnnotationEvidenceSnapshot(candidate) {
  if (!(candidate instanceof AcceptedAnnotationEvidenceSnapshotValue)) {
    failEvidence('EVIDENCE_SNAPSHOT_REQUIRED', 'A branded accepted evidence snapshot is required.');
  }
  return candidate.read();
}
