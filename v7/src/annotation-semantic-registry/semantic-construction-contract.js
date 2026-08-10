import { failSemanticPackage } from './semantic-package-error.js';
import { exactRecord, portableValue } from './portable-value.js';

const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/** Stamp one Artifact construction identity exclusively from active host registration. */
export function semanticDefinitionIdentity(entry) {
  return Object.freeze({
    definitionId: entry.definition.definitionId,
    definitionVersion: entry.definition.definitionVersion,
    packageId: entry.record.manifest.packageId,
    packageVersion: entry.record.manifest.packageVersion,
    status: 'recorded',
  });
}

/** Decide whether one stored Artifact exactly matches an active package definition. */
export function semanticDefinitionMatches(artifact, entry) {
  const identity = artifact?.definition;
  return identity?.status === 'recorded'
    && identity.packageId === entry.record.manifest.packageId
    && identity.packageVersion === entry.record.manifest.packageVersion
    && identity.definitionId === entry.definition.definitionId
    && identity.definitionVersion === entry.definition.definitionVersion;
}

/** Normalize one package construction result without granting host owner handles. */
export function normalizeSemanticConstructionResult(value) {
  exactRecord(
    value,
    ['attributes', 'presentation', 'provenance', 'relations', 'sourceDrawing'],
    'SEMANTIC_CONSTRUCTION_RESULT_INVALID',
    'Semantic construction result',
  );
  let sourceDrawing = null;
  if (value.sourceDrawing !== null) {
    exactRecord(
      value.sourceDrawing,
      ['drawingId', 'revision'],
      'SEMANTIC_CONSTRUCTION_SOURCE_INVALID',
      'Semantic source Drawing',
    );
    if (typeof value.sourceDrawing.drawingId !== 'string'
      || !ARTIFACT_ID.test(value.sourceDrawing.drawingId)
      || !Number.isSafeInteger(value.sourceDrawing.revision)
      || value.sourceDrawing.revision < 1) {
      failSemanticPackage('SEMANTIC_CONSTRUCTION_SOURCE_INVALID', 'Source Drawing is invalid.');
    }
    sourceDrawing = Object.freeze({ ...value.sourceDrawing });
  }
  if (!Array.isArray(value.relations)) {
    failSemanticPackage('SEMANTIC_CONSTRUCTION_RESULT_INVALID', 'Artifact relations must be an array.');
  }
  return Object.freeze({
    attributes: portableValue(value.attributes, 'attributes'),
    presentation: value.presentation === null
      ? null : portableValue(value.presentation, 'presentation'),
    provenance: portableValue(value.provenance, 'provenance'),
    relations: portableValue(value.relations, 'relations'),
    sourceDrawing,
  });
}
