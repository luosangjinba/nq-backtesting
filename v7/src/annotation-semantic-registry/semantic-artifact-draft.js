import { failSemanticPackage } from './semantic-package-error.js';
import {
  normalizeSemanticConstructionResult,
  semanticDefinitionIdentity,
} from './semantic-construction-contract.js';
import { exactRecord } from './portable-value.js';

const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class SemanticArtifactDraftValue {
  #record;
  #registryIdentity;

  constructor(registryIdentity, record) {
    this.#registryIdentity = registryIdentity;
    this.#record = record;
    Object.freeze(this);
  }

  read(registryIdentity) {
    if (registryIdentity !== this.#registryIdentity) {
      failSemanticPackage('SEMANTIC_ARTIFACT_DRAFT_FOREIGN', 'Artifact draft belongs to another Registry.');
    }
    return this.#record;
  }
}

/** Invoke one active construction policy and bind its portable output to a package generation. */
export function createRegistryArtifactDraft({ identity, input, onPolicyFailure, resolveEntry }) {
  exactRecord(
    input,
    ['artifactId', 'construction', 'typeId', 'typeVersion'],
    'SEMANTIC_CONSTRUCTION_INPUT_INVALID',
    'Semantic construction input',
  );
  if (typeof input.artifactId !== 'string' || !ARTIFACT_ID.test(input.artifactId)) {
    failSemanticPackage('SEMANTIC_ARTIFACT_ID_INVALID', 'Artifact id is invalid.');
  }
  const entry = resolveEntry(input.typeId, input.typeVersion);
  if (!entry) failSemanticPackage('SEMANTIC_TYPE_UNRESOLVED', 'Semantic type is not active.');
  let constructed;
  try {
    constructed = normalizeSemanticConstructionResult(
      entry.definition.construct(input.construction),
    );
  } catch (cause) {
    if (cause?.name === 'AnnotationSemanticPackageError'
      && ['SEMANTIC_ARTIFACT_INVALID', 'SEMANTIC_CONSTRUCTION_REJECTED'].includes(cause.code)) {
      throw cause;
    }
    return onPolicyFailure(entry.record, cause);
  }
  return new SemanticArtifactDraftValue(identity, Object.freeze({
    artifactId: input.artifactId,
    attributes: constructed.attributes,
    definition: semanticDefinitionIdentity(entry),
    packageGeneration: entry.record.generation,
    packageId: entry.record.manifest.packageId,
    presentation: constructed.presentation,
    provenance: constructed.provenance,
    relations: constructed.relations,
    sourceDrawing: constructed.sourceDrawing,
    typeId: input.typeId,
    typeVersion: input.typeVersion,
  }));
}

/** Read one construction draft only while its originating package generation is active. */
export function readRegistryArtifactDraft({ candidate, identity, records }) {
  if (!(candidate instanceof SemanticArtifactDraftValue)) {
    failSemanticPackage('SEMANTIC_ARTIFACT_DRAFT_REQUIRED', 'A branded Artifact draft is required.');
  }
  const value = candidate.read(identity);
  const record = records.get(value.packageId);
  if (!record || record.state !== 'active' || record.generation !== value.packageGeneration) {
    failSemanticPackage('SEMANTIC_ARTIFACT_DRAFT_STALE', 'Artifact draft package generation is stale.');
  }
  return value;
}
