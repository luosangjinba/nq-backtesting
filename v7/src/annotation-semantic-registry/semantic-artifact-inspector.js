import { failSemanticPackage } from './semantic-package-error.js';

function field(id, label, value) {
  return Object.freeze({ id, label, readOnly: true, source: 'LOCKED', value });
}

export function createUnresolvedArtifactInspection(artifact, resolution) {
  return Object.freeze({
    groups: Object.freeze([
      Object.freeze({
        fields: Object.freeze([
          field('typeId', 'Type id', artifact.typeId),
          field('resolution', 'Resolution', resolution.packageState),
          field('attributes', 'Raw attributes', artifact.attributes),
        ]),
        id: 'semantic',
        label: 'Semantic · unresolved',
      }),
      Object.freeze({
        fields: Object.freeze([
          field('typeVersion', 'Type version', artifact.typeVersion),
          field('definitionStatus', 'Definition identity', artifact.definition?.status ?? 'missing'),
          field('constructionPackage', 'Construction package', artifact.definition?.packageId ?? 'Unrecorded'),
          field('constructionPackageVersion', 'Package version', artifact.definition?.packageVersion ?? 'Unrecorded'),
          field('definitionId', 'Definition id', artifact.definition?.definitionId ?? 'Unrecorded'),
          field('definitionVersion', 'Definition version', artifact.definition?.definitionVersion ?? 'Unrecorded'),
          field('artifactRevision', 'Artifact revision', artifact.revision),
        ]),
        id: 'history',
        label: 'History',
      }),
    ]),
    resolution,
  });
}

export function hiddenArtifactInspection(artifact, replayCutoffEpochMs) {
  if (!Number.isSafeInteger(replayCutoffEpochMs) || replayCutoffEpochMs < 0) {
    failSemanticPackage(
      'SEMANTIC_REPLAY_CUTOFF_INVALID',
      'Semantic Inspector Replay cutoff is invalid.',
    );
  }
  const observedAt = artifact?.provenance?.observedAtReplayCutoffEpochMs;
  if (!Number.isSafeInteger(observedAt) || observedAt < 0) {
    failSemanticPackage(
      'SEMANTIC_ARTIFACT_INVALID',
      'Semantic Artifact observation provenance is invalid.',
    );
  }
  return observedAt > replayCutoffEpochMs ? Object.freeze({
    groups: Object.freeze([]),
    resolution: null,
    visibility: Object.freeze({ status: 'hidden-before-observation' }),
  }) : null;
}

export function visibleArtifactInspection(inspection) {
  return Object.freeze({
    ...inspection,
    visibility: Object.freeze({ status: 'visible' }),
  });
}
