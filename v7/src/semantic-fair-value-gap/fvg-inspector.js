import { AnnotationSemanticPackageError } from '../annotation-semantic-registry/public.js';
import { readFairValueGapArtifact } from './fvg-artifact.js';

function invalid(message) {
  throw new AnnotationSemanticPackageError('SEMANTIC_ARTIFACT_INVALID', message);
}

function exactContext(value) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).join(',') !== 'replayCutoffEpochMs'
    || !Number.isSafeInteger(value.replayCutoffEpochMs) || value.replayCutoffEpochMs < 0) {
    invalid('FVG Inspector context is invalid.');
  }
  return value.replayCutoffEpochMs;
}

function field(id, label, value, source = 'LOCKED', extra = {}) {
  return Object.freeze({ id, label, readOnly: true, source, value, ...extra });
}

function parameterField(id, label, parameter, editable, formation) {
  const source = parameter.effectiveSource === 'override' ? 'OVERRIDDEN' : 'AUTO';
  const value = {
    baselineValue: parameter.baselineValue,
    id,
    label,
    readOnly: !editable,
    source,
    value: parameter.effectiveValue,
  };
  if (editable) {
    value.control = Object.freeze({
      kind: 'number',
      max: formation.upperPrice,
      min: formation.lowerPrice,
    });
  }
  return Object.freeze(value);
}

function group(id, label, fields) {
  return Object.freeze({ fields: Object.freeze(fields), id, label });
}

/** Produce bounded host-rendered FVG Semantic, Evidence, and History groups. */
export function inspectFairValueGapArtifact(artifactCandidate, context = null) {
  const replayCutoffEpochMs = exactContext(context);
  if (replayCutoffEpochMs === null) return Object.freeze([]);
  const {
    artifact,
    effectiveState,
    formation,
    packageEvidence,
    sourceBars,
  } = readFairValueGapArtifact(artifactCandidate);
  const observedAt = artifact.provenance.observedAtReplayCutoffEpochMs;
  const editable = replayCutoffEpochMs === observedAt;
  const editState = editable
    ? 'Editable at original observation cutoff'
    : 'Return to observation cutoff to edit';
  const latest = effectiveState.events.at(-1) ?? null;
  return Object.freeze([
    group('semantic', 'Semantic', [
      field('direction', 'Direction', artifact.attributes.direction),
      parameterField(
        'lowerPrice',
        'Lower price',
        artifact.attributes.lowerPrice,
        editable,
        formation,
      ),
      parameterField(
        'midpointPrice',
        'Midpoint price',
        artifact.attributes.midpointPrice,
        false,
        formation,
      ),
      parameterField(
        'upperPrice',
        'Upper price',
        artifact.attributes.upperPrice,
        editable,
        formation,
      ),
    ]),
    group('evidence', 'Evidence', [
      field('selectedBar', 'Selected Bar start', packageEvidence.selectedBarStartEpochMs),
      field('sourceBars', 'Three source Bars', sourceBars),
      field(
        'acceptedWorkspaceRevision',
        'Accepted Workspace revision',
        packageEvidence.acceptedWorkspaceRevision,
      ),
      field('paneId', 'Pane', packageEvidence.paneId),
      field('observationCutoff', 'Initial Replay cutoff', observedAt),
      field(
        'profile',
        'Strict profile',
        `${packageEvidence.profile.profileId}@${packageEvidence.profile.profileVersion}`,
      ),
    ]),
    group('history', 'History', [
      field(
        'packageIdentity',
        'Package',
        `${artifact.definition.packageId}@${artifact.definition.packageVersion}`,
      ),
      field(
        'definitionIdentity',
        'Definition',
        `${artifact.definition.definitionId}@${artifact.definition.definitionVersion}`,
      ),
      field('artifactRevision', 'Artifact revision', artifact.revision),
      field('overrideCount', 'Override events', effectiveState.events.length),
      field('latestEditor', 'Latest editor', latest?.editorId ?? 'None'),
      field(
        'latestSourceRevision',
        'Latest source revision',
        latest?.sourceArtifactRevision ?? 'None',
      ),
      field('editState', 'Edit state', editState),
    ]),
  ]);
}
