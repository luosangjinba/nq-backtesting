const LEGACY_DEFINITION = Object.freeze({
  definitionId: null,
  definitionVersion: null,
  packageId: null,
  packageVersion: null,
  status: 'legacy-unrecorded',
});

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function migrateArtifact(artifact) {
  if (!isRecord(artifact)) return artifact;
  const provenance = isRecord(artifact.provenance)
    ? {
      ...artifact.provenance,
      packageProvenance: Object.hasOwn(artifact.provenance, 'packageProvenance')
        ? artifact.provenance.packageProvenance : {},
    }
    : artifact.provenance;
  return {
    ...artifact,
    definition: Object.hasOwn(artifact, 'definition')
      ? artifact.definition : { ...LEGACY_DEFINITION },
    provenance,
  };
}

/** Migrate one portable Annotation Document to the current schema without inventing provenance. */
export function migrateAnnotationDocument(value) {
  if (!isRecord(value) || value.schemaVersion !== 1) return value;
  return {
    ...value,
    artifacts: Array.isArray(value.artifacts) ? value.artifacts.map(migrateArtifact) : value.artifacts,
    schemaVersion: 2,
  };
}
