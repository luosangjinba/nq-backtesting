import { sessionIdsEqual, serializeSessionId } from '../session-identity/public.js';
import { AnnotationSemanticPackageError } from '../annotation-semantic-registry/public.js';

const CONSTRUCTION_FIELDS = Object.freeze(['createdAtEpochMs', 'evidence', 'mode', 'sessionId']);
const OFFSETS = Object.freeze([-1, 0, 1]);

function reject(message, cause) {
  throw new AnnotationSemanticPackageError(
    'SEMANTIC_CONSTRUCTION_REJECTED',
    message,
    cause === undefined ? undefined : { cause },
  );
}
function exact(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    reject(`${label} fields are invalid.`);
  }
}

function readBundle(evidenceContract, candidate) {
  try {
    return evidenceContract.readAnnotationEvidenceBundle(candidate);
  } catch (cause) {
    reject('FVG construction requires one branded Annotation Evidence Bundle.', cause);
  }
}

function requireSessionMatch(sessionId, evidenceSessionId) {
  try {
    if (!sessionIdsEqual(sessionId, evidenceSessionId)) {
      reject('FVG construction Session does not match its evidence Session.');
    }
    return serializeSessionId(sessionId);
  } catch (cause) {
    if (cause instanceof AnnotationSemanticPackageError) throw cause;
    reject('FVG construction requires one branded Session identity.', cause);
  }
}

function sameReferenceIdentity(references, field) {
  return references.every((reference) => reference[field] === references[0][field]);
}

function validateBundle(bundle) {
  if (bundle.schemaVersion !== 1 || !Number.isSafeInteger(bundle.acceptedWorkspaceRevision)
    || bundle.acceptedWorkspaceRevision < 0 || typeof bundle.paneId !== 'string'
    || bundle.paneId.length === 0 || !Number.isSafeInteger(bundle.replayCutoffEpochMs)
    || bundle.replayCutoffEpochMs < 0 || !Array.isArray(bundle.artifactReferences)
    || bundle.artifactReferences.length !== 0 || !Array.isArray(bundle.bars)
    || bundle.bars.length !== 3) {
    reject('FVG evidence must contain one bounded three-Bar selection and no Artifacts.');
  }
  if (!bundle.bars.every((bar, index) => bar.relativeOffset === OFFSETS[index])) {
    reject('FVG evidence must use exact relative Bar offsets -1, 0, and 1.');
  }
  const references = bundle.bars.map(({ reference }) => reference);
  for (const field of [
    'datasetRevision', 'displayTimeframeId', 'instrumentId',
    'observedAtReplayCutoffEpochMs', 'sourceTimeframeId',
  ]) {
    if (!sameReferenceIdentity(references, field)) {
      reject(`FVG source Bar ${field} identity is inconsistent.`);
    }
  }
  if (references.some((reference) => (
    !Number.isSafeInteger(reference.startEpochMs)
    || !Number.isSafeInteger(reference.endEpochMs)
    || reference.startEpochMs < 0
    || reference.startEpochMs >= reference.endEpochMs
    || reference.endEpochMs > bundle.replayCutoffEpochMs
    || reference.observedAtReplayCutoffEpochMs !== bundle.replayCutoffEpochMs
  ))) {
    reject('FVG source Bar intervals or Replay cutoff are invalid.');
  }
  if (references[0].endEpochMs !== references[1].startEpochMs
    || references[1].endEpochMs !== references[2].startEpochMs) {
    reject('FVG source Bars must be exactly adjacent without a time gap.');
  }
  return Object.freeze({ bars: bundle.bars, references });
}

/** Normalize one exact host-composed, evidence-derived FVG construction input. */
export function readFvgConstructionEvidence(value, evidenceContract) {
  exact(value, CONSTRUCTION_FIELDS, 'FVG construction');
  if (value.mode !== 'evidence-derived' || !Number.isSafeInteger(value.createdAtEpochMs)
    || value.createdAtEpochMs < 0) {
    reject('FVG construction mode or creation time is invalid.');
  }
  const bundle = readBundle(evidenceContract, value.evidence);
  const session = requireSessionMatch(value.sessionId, bundle.sessionId);
  const validated = validateBundle(bundle);
  return Object.freeze({
    bars: validated.bars,
    bundle,
    createdAtEpochMs: value.createdAtEpochMs,
    session,
  });
}

/** Strip resolver-only fields into the exact portable core Artifact source-Bar shape. */
export function fvgSourceBarReferences(bars) {
  return Object.freeze(bars.map(({ reference }) => Object.freeze({
    datasetRevision: reference.datasetRevision,
    endEpochMs: reference.endEpochMs,
    instrumentId: reference.instrumentId,
    sourceTimeframeId: reference.sourceTimeframeId,
    startEpochMs: reference.startEpochMs,
  })));
}
