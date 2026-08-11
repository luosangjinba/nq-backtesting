import { failSemanticPackage } from './semantic-package-error.js';
import { semanticDefinitionMatches } from './semantic-construction-contract.js';
import { exactRecord, portableValue } from './portable-value.js';

const EDITOR_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const FIELD_ID = /^[a-z][A-Za-z0-9.-]{0,63}$/;
const MAX_FIELDS = 32;

class SemanticArtifactRevisionDraftValue {
  #identity;
  #value;

  constructor(identity, value) {
    this.#identity = identity;
    this.#value = value;
    Object.freeze(this);
  }

  read(identity) {
    if (identity !== this.#identity) {
      failSemanticPackage(
        'SEMANTIC_ARTIFACT_REVISION_DRAFT_FOREIGN',
        'Artifact revision draft belongs to another Registry.',
      );
    }
    return this.#value;
  }
}

/** Normalize one host-authored semantic edit envelope before package policy invocation. */
export function normalizeSemanticRevisionRequest(value) {
  exactRecord(
    value,
    ['editedAtEpochMs', 'editorId', 'fields', 'replayCutoffEpochMs'],
    'SEMANTIC_REVISION_INPUT_INVALID',
    'Semantic revision request',
  );
  if (typeof value.editorId !== 'string' || !EDITOR_ID.test(value.editorId)
    || !Number.isSafeInteger(value.editedAtEpochMs) || value.editedAtEpochMs < 0
    || !Number.isSafeInteger(value.replayCutoffEpochMs) || value.replayCutoffEpochMs < 0
    || !value.fields || typeof value.fields !== 'object' || Array.isArray(value.fields)) {
    failSemanticPackage('SEMANTIC_REVISION_INPUT_INVALID', 'Semantic revision request is invalid.');
  }
  const fieldIds = Object.keys(value.fields);
  if (fieldIds.length < 1 || fieldIds.length > MAX_FIELDS
    || fieldIds.some((id) => !FIELD_ID.test(id))) {
    failSemanticPackage('SEMANTIC_REVISION_INPUT_INVALID', 'Semantic revision fields are invalid.');
  }
  return Object.freeze({
    editedAtEpochMs: value.editedAtEpochMs,
    editorId: value.editorId,
    fields: portableValue(value.fields, 'revision.fields'),
    replayCutoffEpochMs: value.replayCutoffEpochMs,
  });
}

/** Constrain package revision output to portable replaceable Artifact surfaces. */
export function normalizeSemanticRevisionResult(value) {
  exactRecord(
    value,
    ['attributes', 'presentation', 'relations'],
    'SEMANTIC_REVISION_RESULT_INVALID',
    'Semantic revision result',
  );
  if (!Array.isArray(value.relations)) {
    failSemanticPackage('SEMANTIC_REVISION_RESULT_INVALID', 'Artifact relations must be an array.');
  }
  return Object.freeze({
    attributes: portableValue(value.attributes, 'revision.attributes'),
    presentation: value.presentation === null
      ? null : portableValue(value.presentation, 'revision.presentation'),
    relations: portableValue(value.relations, 'revision.relations'),
  });
}

export function createSemanticArtifactRevisionDraft(identity, value) {
  return new SemanticArtifactRevisionDraftValue(identity, Object.freeze(value));
}

export function readSemanticArtifactRevisionDraft(candidate, identity) {
  if (!(candidate instanceof SemanticArtifactRevisionDraftValue)) {
    failSemanticPackage(
      'SEMANTIC_ARTIFACT_REVISION_DRAFT_REQUIRED',
      'A branded Artifact revision draft is required.',
    );
  }
  return candidate.read(identity);
}

function expectedRevisionRejection(error) {
  return error?.name === 'AnnotationSemanticPackageError'
    && ['SEMANTIC_ARTIFACT_INVALID', 'SEMANTIC_REVISION_REJECTED'].includes(error.code);
}

function revisionSource(value) {
  if (!value || typeof value !== 'object' || value.status !== 'active'
    || !Number.isSafeInteger(value.revision) || value.revision < 1
    || value.revision === Number.MAX_SAFE_INTEGER) {
    failSemanticPackage(
      'SEMANTIC_ARTIFACT_REVISION_SOURCE_INVALID',
      'Artifact revision source must be one active exact revision.',
    );
  }
  return value;
}

/** Execute one active definition's pure revision policy and brand its exact-generation result. */
export function createRegistryArtifactRevisionDraft({
  identity,
  input,
  onPolicyFailure,
  resolveEntry,
}) {
  exactRecord(
    input,
    ['artifact', 'revision'],
    'SEMANTIC_REVISION_INPUT_INVALID',
    'Artifact revision draft input',
  );
  const artifact = revisionSource(input.artifact);
  const entry = resolveEntry(artifact);
  if (!entry || !semanticDefinitionMatches(artifact, entry)) {
    failSemanticPackage('SEMANTIC_TYPE_UNRESOLVED', 'Semantic type is not active or compatible.');
  }
  if (entry.definition.revise === null) {
    failSemanticPackage('SEMANTIC_REVISION_UNSUPPORTED', 'Semantic type has no revision policy.');
  }
  const revision = normalizeSemanticRevisionRequest(input.revision);
  let revised;
  try {
    revised = normalizeSemanticRevisionResult(
      entry.definition.revise(artifact, revision),
    );
  } catch (cause) {
    if (expectedRevisionRejection(cause)) throw cause;
    return onPolicyFailure(entry.record, cause);
  }
  const candidate = Object.freeze({
    artifactId: artifact.artifactId,
    attributes: revised.attributes,
    definition: artifact.definition,
    presentation: revised.presentation,
    provenance: artifact.provenance,
    relations: revised.relations,
    typeId: artifact.typeId,
    typeVersion: artifact.typeVersion,
  });
  return createSemanticArtifactRevisionDraft(identity, {
    artifact: candidate,
    packageGeneration: entry.record.generation,
    packageId: entry.record.manifest.packageId,
    previewArtifact: Object.freeze({
      ...artifact,
      attributes: revised.attributes,
      presentation: revised.presentation,
      relations: revised.relations,
      revision: artifact.revision + 1,
    }),
    sourceArtifact: Object.freeze({
      artifactId: artifact.artifactId,
      revision: artifact.revision,
    }),
  });
}

/** Read one opaque revision draft only while its originating package generation is active. */
export function readRegistryArtifactRevisionDraft({ candidate, identity, records }) {
  const value = readSemanticArtifactRevisionDraft(candidate, identity);
  const record = records.get(value.packageId);
  if (!record || record.state !== 'active' || record.generation !== value.packageGeneration) {
    failSemanticPackage(
      'SEMANTIC_ARTIFACT_REVISION_DRAFT_STALE',
      'Artifact revision draft package generation is stale.',
    );
  }
  return value;
}
