import { failEvidence } from './evidence-error.js';
import {
  count,
  epoch,
  exactRecord,
  opaqueId,
} from './evidence-validation.js';

const SELECTION_FIELDS = Object.freeze(['artifactReferences', 'barStartEpochMs', 'schemaVersion']);
const ARTIFACT_REFERENCE_FIELDS = Object.freeze(['artifactId', 'revision']);
const REQUIREMENT_FIELDS = Object.freeze([
  'followingBars', 'maximumArtifactReferences', 'precedingBars', 'schemaVersion',
]);
const MAX_NEIGHBORS_PER_SIDE = 16;
const MAX_BAR_EVIDENCE = 32;
const MAX_ARTIFACT_REFERENCES = 32;

class AnnotationEvidenceSelectionValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

class AnnotationEvidenceRequirementValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function artifactReference(value) {
  exactRecord(
    value,
    ARTIFACT_REFERENCE_FIELDS,
    'EVIDENCE_SELECTION_ARTIFACT_INVALID',
    'Selected Artifact reference',
  );
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) {
    failEvidence('EVIDENCE_SELECTION_ARTIFACT_INVALID', 'Selected Artifact revision must be positive.');
  }
  return Object.freeze({
    artifactId: opaqueId(
      value.artifactId,
      'EVIDENCE_SELECTION_ARTIFACT_INVALID',
      'Selected Artifact id',
    ),
    revision: value.revision,
  });
}

/** Create the exact user Bar selection plus optional exact Artifact revisions. */
export function createAnnotationEvidenceSelection(value) {
  exactRecord(value, SELECTION_FIELDS, 'EVIDENCE_SELECTION_INVALID', 'Evidence selection');
  if (value.schemaVersion !== 1 || !Array.isArray(value.artifactReferences)
    || value.artifactReferences.length > MAX_ARTIFACT_REFERENCES) {
    failEvidence('EVIDENCE_SELECTION_INVALID', 'Evidence selection is invalid or unbounded.');
  }
  const artifactReferences = Object.freeze(value.artifactReferences.map(artifactReference));
  if (new Set(artifactReferences.map(({ artifactId }) => artifactId)).size
    !== artifactReferences.length) {
    failEvidence('EVIDENCE_SELECTION_ARTIFACT_DUPLICATE', 'Selected Artifact ids must be unique.');
  }
  return new AnnotationEvidenceSelectionValue(Object.freeze({
    artifactReferences,
    barStartEpochMs: epoch(
      value.barStartEpochMs,
      'EVIDENCE_SELECTION_BAR_INVALID',
      'Selected Bar start',
    ),
    schemaVersion: 1,
  }));
}

/** Declare one bounded contiguous Bar neighborhood and Artifact-reference ceiling. */
export function createAnnotationEvidenceRequirement(value) {
  exactRecord(value, REQUIREMENT_FIELDS, 'EVIDENCE_REQUIREMENT_INVALID', 'Evidence requirement');
  if (value.schemaVersion !== 1) {
    failEvidence('EVIDENCE_REQUIREMENT_INVALID', 'Evidence requirement requires schemaVersion 1.');
  }
  const precedingBars = count(
    value.precedingBars,
    MAX_NEIGHBORS_PER_SIDE,
    'EVIDENCE_REQUIREMENT_INVALID',
    'Preceding Bar count',
  );
  const followingBars = count(
    value.followingBars,
    MAX_NEIGHBORS_PER_SIDE,
    'EVIDENCE_REQUIREMENT_INVALID',
    'Following Bar count',
  );
  if (precedingBars + 1 + followingBars > MAX_BAR_EVIDENCE) {
    failEvidence('EVIDENCE_REQUIREMENT_INVALID', 'Resolved Bar evidence exceeds the 32-Bar limit.');
  }
  return new AnnotationEvidenceRequirementValue(Object.freeze({
    followingBars,
    maximumArtifactReferences: count(
      value.maximumArtifactReferences,
      MAX_ARTIFACT_REFERENCES,
      'EVIDENCE_REQUIREMENT_INVALID',
      'Maximum Artifact reference count',
    ),
    precedingBars,
    schemaVersion: 1,
  }));
}

export function readAnnotationEvidenceSelection(candidate) {
  if (!(candidate instanceof AnnotationEvidenceSelectionValue)) {
    failEvidence('EVIDENCE_SELECTION_REQUIRED', 'A branded evidence selection is required.');
  }
  return candidate.read();
}

export function readAnnotationEvidenceRequirement(candidate) {
  if (!(candidate instanceof AnnotationEvidenceRequirementValue)) {
    failEvidence('EVIDENCE_REQUIREMENT_REQUIRED', 'A branded evidence requirement is required.');
  }
  return candidate.read();
}
