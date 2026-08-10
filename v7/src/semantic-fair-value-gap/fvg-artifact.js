import { AnnotationSemanticPackageError } from '../annotation-semantic-registry/public.js';
import { deriveStrictFvgFormation } from './fvg-formation.js';
import { fvgSourceBarReferences } from './fvg-evidence.js';

export const FAIR_VALUE_GAP_TYPE_ID = 'imbalance.fvg';
export const FAIR_VALUE_GAP_VERSION = '1.0.0';
export const FAIR_VALUE_GAP_PROFILE = Object.freeze({
  profileId: 'imbalance.fvg.strict-three-bar-wick-gap',
  profileVersion: FAIR_VALUE_GAP_VERSION,
});

function invalid(message) {
  throw new AnnotationSemanticPackageError('SEMANTIC_ARTIFACT_INVALID', message);
}
function exact(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    invalid(`${label} fields are invalid.`);
  }
}

function parameter(value, expected, label) {
  exact(
    value,
    ['baselineValue', 'effectiveSource', 'effectiveValue', 'overrideProvenance'],
    label,
  );
  if (value.effectiveSource !== 'derived' || value.overrideProvenance !== null
    || value.baselineValue !== expected || value.effectiveValue !== expected) {
    invalid(`${label} does not retain its derived baseline.`);
  }
}

/** Validate one resolved stored FVG Artifact without requesting external evidence. */
export function readFairValueGapArtifact(artifact) {
  if (!artifact || typeof artifact !== 'object' || artifact.typeId !== FAIR_VALUE_GAP_TYPE_ID
    || artifact.typeVersion !== FAIR_VALUE_GAP_VERSION || artifact.status !== 'active'
    || !Number.isSafeInteger(artifact.revision) || artifact.revision < 1) {
    invalid('Stored FVG Artifact identity or lifecycle is invalid.');
  }
  const packageEvidence = artifact.provenance?.packageProvenance;
  exact(
    packageEvidence,
    ['acceptedWorkspaceRevision', 'bars', 'paneId', 'profile', 'selectedBarStartEpochMs', 'session'],
    'FVG package provenance',
  );
  exact(packageEvidence.profile, ['profileId', 'profileVersion'], 'FVG profile');
  if (packageEvidence.profile.profileId !== FAIR_VALUE_GAP_PROFILE.profileId
    || packageEvidence.profile.profileVersion !== FAIR_VALUE_GAP_PROFILE.profileVersion
    || !Array.isArray(packageEvidence.bars) || packageEvidence.bars.length !== 3) {
    invalid('Stored FVG profile or Bar evidence is invalid.');
  }
  let formation;
  try {
    formation = deriveStrictFvgFormation(packageEvidence.bars);
  } catch (cause) {
    throw new AnnotationSemanticPackageError(
      'SEMANTIC_ARTIFACT_INVALID',
      'Stored FVG evidence no longer satisfies its recorded definition.',
      { cause },
    );
  }
  exact(
    artifact.attributes,
    ['direction', 'formation', 'lowerPrice', 'midpointPrice', 'upperPrice'],
    'FVG attributes',
  );
  if (artifact.attributes.direction !== formation.direction
    || JSON.stringify(artifact.attributes.formation) !== JSON.stringify(formation.attributes.formation)
    || packageEvidence.selectedBarStartEpochMs
      !== formation.attributes.formation.selectedBarStartEpochMs) {
    invalid('Stored FVG direction or formation identity is inconsistent.');
  }
  parameter(artifact.attributes.lowerPrice, formation.lowerPrice, 'FVG lower price');
  parameter(artifact.attributes.midpointPrice, formation.midpointPrice, 'FVG midpoint price');
  parameter(artifact.attributes.upperPrice, formation.upperPrice, 'FVG upper price');
  const sourceBars = fvgSourceBarReferences(packageEvidence.bars);
  if (JSON.stringify(artifact.provenance.sourceBars) !== JSON.stringify(sourceBars)
    || artifact.provenance.instrumentId !== sourceBars[0].instrumentId
    || artifact.provenance.sourceTimeframeId !== sourceBars[0].sourceTimeframeId
    || artifact.provenance.observedAtReplayCutoffEpochMs
      !== packageEvidence.bars[0].reference.observedAtReplayCutoffEpochMs
    || artifact.provenance.recognitionSource !== 'human'
    || artifact.provenance.constructionSource !== 'derived'
    || artifact.provenance.promotedFromDrawingId !== null
    || artifact.provenance.manualAnchors?.length !== 0) {
    invalid('Stored FVG core provenance is inconsistent with package evidence.');
  }
  return Object.freeze({ artifact, formation, packageEvidence, sourceBars });
}
