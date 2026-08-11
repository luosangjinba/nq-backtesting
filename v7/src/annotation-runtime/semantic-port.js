import { failAnnotation } from './annotation-error.js';
import { normalizeSemanticArtifactCandidate } from './semantic-artifact.js';

export function normalizeSemanticContract(candidate) {
  if (candidate === null || candidate === undefined) return null;
  if (typeof candidate !== 'object' || typeof candidate.readArtifactDraft !== 'function'
    || typeof candidate.readArtifactRevisionDraft !== 'function'
    || typeof candidate.snapshot !== 'function') {
    failAnnotation(
      'ANNOTATION_SEMANTIC_CONTRACT_INVALID',
      'Semantic capability must expose draft reading and lifecycle snapshot ports.',
    );
  }
  return Object.freeze({
    readArtifactDraft: candidate.readArtifactDraft,
    readArtifactRevisionDraft: candidate.readArtifactRevisionDraft,
    snapshot: candidate.snapshot,
  });
}

export function readSemanticDraft(contract, candidate) {
  if (contract === null) {
    failAnnotation('ANNOTATION_SEMANTIC_UNAVAILABLE', 'Semantic package capability is unavailable.');
  }
  let draft;
  try { draft = contract.readArtifactDraft(candidate); } catch (cause) {
    failAnnotation('ANNOTATION_SEMANTIC_DRAFT_INVALID', 'Semantic Artifact draft was rejected.', { cause });
  }
  const artifact = normalizeSemanticArtifactCandidate({
    artifactId: draft.artifactId,
    attributes: draft.attributes,
    definition: draft.definition,
    presentation: draft.presentation,
    provenance: draft.provenance,
    relations: draft.relations,
    typeId: draft.typeId,
    typeVersion: draft.typeVersion,
  });
  return Object.freeze({ artifact, sourceDrawing: draft.sourceDrawing });
}

export function readSemanticRevisionDraft(contract, candidate) {
  if (contract === null) {
    failAnnotation('ANNOTATION_SEMANTIC_UNAVAILABLE', 'Semantic package capability is unavailable.');
  }
  let draft;
  try { draft = contract.readArtifactRevisionDraft(candidate); } catch (cause) {
    failAnnotation(
      'ANNOTATION_SEMANTIC_REVISION_DRAFT_INVALID',
      'Semantic Artifact revision draft was rejected.',
      { cause },
    );
  }
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)
    || Object.keys(draft).sort().join(',') !== 'artifact,sourceArtifact'
    || !draft.sourceArtifact || typeof draft.sourceArtifact !== 'object'
    || Object.keys(draft.sourceArtifact).sort().join(',') !== 'artifactId,revision'
    || typeof draft.sourceArtifact.artifactId !== 'string'
    || !Number.isSafeInteger(draft.sourceArtifact.revision)
    || draft.sourceArtifact.revision < 1) {
    failAnnotation(
      'ANNOTATION_SEMANTIC_REVISION_DRAFT_INVALID',
      'Semantic Artifact revision draft result is invalid.',
    );
  }
  const artifact = normalizeSemanticArtifactCandidate(draft.artifact);
  if (artifact.artifactId !== draft.sourceArtifact.artifactId) {
    failAnnotation(
      'ANNOTATION_SEMANTIC_REVISION_DRAFT_INVALID',
      'Semantic Artifact revision draft changed Artifact identity.',
    );
  }
  return Object.freeze({ artifact, sourceArtifact: Object.freeze({ ...draft.sourceArtifact }) });
}

export function activeSemanticPackageCount(contract) {
  if (contract === null) return 0;
  const snapshot = contract.snapshot();
  return Number.isSafeInteger(snapshot?.activePackageCount) ? snapshot.activePackageCount : 0;
}
