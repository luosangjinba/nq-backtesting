import { failAnnotation } from './annotation-error.js';
import { createDrawingPresentation, readDrawingPresentation } from './drawing-presentation.js';

const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const NAMESPACED_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const DEFINITION_FIELDS = Object.freeze([
  'definitionId', 'definitionVersion', 'packageId', 'packageVersion', 'status',
]);
const PROVENANCE_FIELDS = Object.freeze([
  'constructionSource', 'createdAtEpochMs', 'instrumentId', 'manualAnchors',
  'observedAtReplayCutoffEpochMs', 'packageProvenance', 'promotedFromDrawingId',
  'recognitionSource', 'sourceBars', 'sourceTimeframeId',
]);

function exact(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failAnnotation(code, `${label} fields are invalid.`);
  }
}

function portable(value, path, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) failAnnotation('SEMANTIC_ARTIFACT_PORTABLE_INVALID', `${path} is invalid.`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (!value || typeof value !== 'object' || ancestors.has(value)) {
    failAnnotation('SEMANTIC_ARTIFACT_PORTABLE_INVALID', `${path} is invalid.`);
  }
  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((entry, index) => portable(entry, `${path}[${index}]`, ancestors));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      failAnnotation('SEMANTIC_ARTIFACT_PORTABLE_INVALID', `${path} must use plain records.`);
    }
    result = Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      portable(value[key], `${path}.${key}`, ancestors),
    ]));
  }
  ancestors.delete(value);
  return Object.freeze(result);
}

function epoch(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failAnnotation('SEMANTIC_ARTIFACT_PROVENANCE_INVALID', `${label} is invalid.`);
  }
  return value;
}

function definitionIdentity(value, { stored = false } = {}) {
  exact(value, DEFINITION_FIELDS, 'SEMANTIC_ARTIFACT_DEFINITION_INVALID', 'Artifact definition');
  if (value.status === 'legacy-unrecorded' && stored) {
    if (value.definitionId !== null || value.definitionVersion !== null
      || value.packageId !== null || value.packageVersion !== null) {
      failAnnotation(
        'SEMANTIC_ARTIFACT_DEFINITION_INVALID',
        'Legacy Artifact definition identity must remain unrecorded.',
      );
    }
    return Object.freeze({ ...value });
  }
  if (value.status !== 'recorded'
    || typeof value.definitionId !== 'string' || !NAMESPACED_ID.test(value.definitionId)
    || typeof value.definitionVersion !== 'string' || !VERSION.test(value.definitionVersion)
    || typeof value.packageId !== 'string' || !NAMESPACED_ID.test(value.packageId)
    || typeof value.packageVersion !== 'string' || !VERSION.test(value.packageVersion)) {
    failAnnotation('SEMANTIC_ARTIFACT_DEFINITION_INVALID', 'Artifact definition identity is invalid.');
  }
  return Object.freeze({ ...value });
}

function artifactProvenance(value) {
  exact(value, PROVENANCE_FIELDS, 'SEMANTIC_ARTIFACT_PROVENANCE_INVALID', 'Artifact provenance');
  const observed = epoch(value.observedAtReplayCutoffEpochMs, 'Observed Replay cutoff');
  if (!['human', 'detector', 'import'].includes(value.recognitionSource)
    || !['manual', 'derived', 'import'].includes(value.constructionSource)
    || typeof value.instrumentId !== 'string' || value.instrumentId.length === 0
    || typeof value.sourceTimeframeId !== 'string' || value.sourceTimeframeId.length === 0
    || (value.promotedFromDrawingId !== null
      && (typeof value.promotedFromDrawingId !== 'string'
        || !ARTIFACT_ID.test(value.promotedFromDrawingId)))
    || !Array.isArray(value.manualAnchors) || value.manualAnchors.length > 32
    || !Array.isArray(value.sourceBars) || value.sourceBars.length > 32) {
    failAnnotation('SEMANTIC_ARTIFACT_PROVENANCE_INVALID', 'Artifact provenance is invalid.');
  }
  const manualAnchors = value.manualAnchors.map((anchor) => {
    exact(anchor, ['epochMs', 'instrumentId', 'price'], 'SEMANTIC_ARTIFACT_ANCHOR_INVALID', 'Artifact anchor');
    if (anchor.instrumentId !== value.instrumentId || !Number.isFinite(anchor.price)
      || epoch(anchor.epochMs, 'Artifact anchor epoch') > observed) {
      failAnnotation('SEMANTIC_ARTIFACT_ANCHOR_INVALID', 'Artifact anchor is invalid or future-visible.');
    }
    return Object.freeze({ ...anchor, price: Object.is(anchor.price, -0) ? 0 : anchor.price });
  });
  const sourceBars = value.sourceBars.map((bar) => {
    exact(
      bar,
      ['datasetRevision', 'endEpochMs', 'instrumentId', 'sourceTimeframeId', 'startEpochMs'],
      'SEMANTIC_ARTIFACT_SOURCE_BAR_INVALID',
      'Artifact source Bar',
    );
    if (bar.instrumentId !== value.instrumentId || bar.sourceTimeframeId !== value.sourceTimeframeId
      || typeof bar.datasetRevision !== 'string' || bar.datasetRevision.length === 0
      || epoch(bar.startEpochMs, 'Source Bar start') >= epoch(bar.endEpochMs, 'Source Bar end')
      || bar.endEpochMs > observed) {
      failAnnotation('SEMANTIC_ARTIFACT_SOURCE_BAR_INVALID', 'Artifact source Bar is invalid or future-visible.');
    }
    return Object.freeze({ ...bar });
  });
  return Object.freeze({
    ...value,
    createdAtEpochMs: epoch(value.createdAtEpochMs, 'Artifact creation time'),
    manualAnchors: Object.freeze(manualAnchors),
    observedAtReplayCutoffEpochMs: observed,
    packageProvenance: portable(value.packageProvenance, 'provenance.packageProvenance'),
    sourceBars: Object.freeze(sourceBars),
  });
}

function presentation(value) {
  return value === null ? null : readDrawingPresentation(createDrawingPresentation(value));
}

function normalizeCandidate(value, { storedDefinition = false } = {}) {
  exact(
    value,
    [
      'artifactId', 'attributes', 'definition', 'presentation', 'provenance', 'relations',
      'typeId', 'typeVersion',
    ],
    'SEMANTIC_ARTIFACT_CANDIDATE_INVALID',
    'Semantic Artifact candidate',
  );
  if (typeof value.artifactId !== 'string' || !ARTIFACT_ID.test(value.artifactId)
    || typeof value.typeId !== 'string' || !NAMESPACED_ID.test(value.typeId)
    || typeof value.typeVersion !== 'string' || !VERSION.test(value.typeVersion)
    || !Array.isArray(value.relations)) {
    failAnnotation('SEMANTIC_ARTIFACT_CANDIDATE_INVALID', 'Semantic Artifact candidate is invalid.');
  }
  return Object.freeze({
    artifactId: value.artifactId,
    attributes: portable(value.attributes, 'attributes'),
    definition: definitionIdentity(value.definition, { stored: storedDefinition }),
    presentation: presentation(value.presentation),
    provenance: artifactProvenance(value.provenance),
    relations: portable(value.relations, 'relations'),
    typeId: value.typeId,
    typeVersion: value.typeVersion,
  });
}

export function normalizeSemanticArtifactCandidate(value) {
  return normalizeCandidate(value);
}

export function restoreSemanticArtifact(value, sessionId) {
  exact(
    value,
    [
      'artifactId', 'attributes', 'presentation', 'provenance', 'relations', 'revision',
      'scope', 'status', 'typeId', 'typeVersion', 'definition',
    ],
    'SEMANTIC_ARTIFACT_STORED_INVALID',
    'Stored Semantic Artifact',
  );
  exact(value.scope, ['kind', 'sessionId'], 'SEMANTIC_ARTIFACT_SCOPE_INVALID', 'Artifact scope');
  if (value.scope.kind !== 'session' || value.scope.sessionId !== sessionId
    || !['active', 'archived'].includes(value.status)
    || !Number.isSafeInteger(value.revision) || value.revision < 1) {
    failAnnotation('SEMANTIC_ARTIFACT_STORED_INVALID', 'Stored Semantic Artifact is invalid.');
  }
  const candidate = {
    artifactId: value.artifactId,
    attributes: value.attributes,
    definition: value.definition,
    presentation: value.presentation,
    provenance: value.provenance,
    relations: value.relations,
    typeId: value.typeId,
    typeVersion: value.typeVersion,
  };
  return freezeSemanticArtifact({
    ...normalizeCandidate(candidate, { storedDefinition: true }),
    revision: value.revision,
    sessionId,
    status: value.status,
  });
}

export function freezeSemanticArtifact(value) {
  return Object.freeze({
    artifactId: value.artifactId,
    attributes: value.attributes,
    definition: value.definition,
    presentation: value.presentation,
    provenance: value.provenance,
    relations: value.relations,
    revision: value.revision,
    scope: Object.freeze({ kind: 'session', sessionId: value.sessionId }),
    status: value.status,
    typeId: value.typeId,
    typeVersion: value.typeVersion,
  });
}
