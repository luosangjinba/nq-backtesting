import { failInteraction } from './interaction-error.js';
import { requireExactRecord, requireOpaqueId } from './drawing-inspector-draft.js';

export const SEMANTIC_SELECT_FIELDS = Object.freeze(['artifactId', 'replayCutoffEpochMs']);
export const SEMANTIC_PATCH_FIELDS = Object.freeze([
  'expectedDraftRevision', 'field', 'value',
]);

function methods(candidate, names, code, label) {
  for (const name of names) {
    if (typeof candidate?.[name] !== 'function') {
      failInteraction(code, `${label} requires ${name}().`);
    }
  }
  return candidate;
}

export function requireSemanticArtifactPort(candidate) {
  return methods(
    candidate,
    ['readArtifact', 'reviseArtifact'],
    'ANNOTATION_SEMANTIC_INSPECTOR_ARTIFACT_PORT_INVALID',
    'Semantic Artifact port',
  );
}

export function requireSemanticRegistryPort(candidate) {
  return methods(
    candidate,
    [
      'createArtifactRevisionDraft',
      'inspectArtifactAtReplayCutoff',
      'projectionInputsForArtifactRevisionDraft',
    ],
    'ANNOTATION_SEMANTIC_INSPECTOR_REGISTRY_PORT_INVALID',
    'Semantic Registry port',
  );
}

export function requireSemanticSelection(value) {
  requireExactRecord(
    value,
    SEMANTIC_SELECT_FIELDS,
    'ANNOTATION_SEMANTIC_INSPECTOR_SELECTION_INVALID',
    'Semantic Inspector selection',
  );
  if (!Number.isSafeInteger(value.replayCutoffEpochMs) || value.replayCutoffEpochMs < 0) {
    failInteraction(
      'ANNOTATION_SEMANTIC_INSPECTOR_SELECTION_INVALID',
      'Semantic Inspector Replay cutoff is invalid.',
    );
  }
  return Object.freeze({
    artifactId: requireOpaqueId(
      value.artifactId,
      'ANNOTATION_SEMANTIC_INSPECTOR_SELECTION_INVALID',
      'Artifact id',
    ),
    replayCutoffEpochMs: value.replayCutoffEpochMs,
  });
}

export function requireSemanticArtifactRecord(value, expectedArtifactId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Number.isSafeInteger(value.documentRevision) || value.documentRevision < 0
    || !value.artifact || typeof value.artifact !== 'object'
    || value.artifact.artifactId !== expectedArtifactId
    || value.artifact.status !== 'active'
    || !Number.isSafeInteger(value.artifact.revision) || value.artifact.revision < 1) {
    failInteraction(
      'ANNOTATION_SEMANTIC_INSPECTOR_ARTIFACT_RESULT_INVALID',
      'Semantic Artifact query returned invalid state.',
    );
  }
  return value;
}

export function requireSemanticInspection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Array.isArray(value.groups) || value.groups.length > 8
    || !value.visibility || !['hidden-before-observation', 'visible'].includes(
      value.visibility.status,
    )) {
    failInteraction(
      'ANNOTATION_SEMANTIC_INSPECTOR_SCHEMA_INVALID',
      'Semantic inspection result is invalid.',
    );
  }
  const fields = new Map();
  for (const group of value.groups) {
    if (!group || typeof group !== 'object' || !Array.isArray(group.fields)) {
      failInteraction(
        'ANNOTATION_SEMANTIC_INSPECTOR_SCHEMA_INVALID',
        'Semantic inspection group is invalid.',
      );
    }
    for (const field of group.fields) {
      if (!field || typeof field !== 'object' || typeof field.id !== 'string'
        || fields.has(field.id) || typeof field.readOnly !== 'boolean') {
        failInteraction(
          'ANNOTATION_SEMANTIC_INSPECTOR_SCHEMA_INVALID',
          'Semantic inspection field is invalid.',
        );
      }
      if (!field.readOnly && (field.control?.kind !== 'number'
        || !Number.isFinite(field.control.min) || !Number.isFinite(field.control.max)
        || field.control.min > field.control.max || !Number.isFinite(field.value))) {
        failInteraction(
          'ANNOTATION_SEMANTIC_INSPECTOR_SCHEMA_INVALID',
          'Editable Semantic inspection field is invalid.',
        );
      }
      fields.set(field.id, field);
    }
  }
  if (fields.size > 32) {
    failInteraction(
      'ANNOTATION_SEMANTIC_INSPECTOR_SCHEMA_INVALID',
      'Semantic inspection field count is unbounded.',
    );
  }
  return Object.freeze({ fields, groups: value.groups, visibility: value.visibility });
}

export function fieldValues(fields) {
  return Object.freeze(Object.fromEntries([...fields].map(([id, field]) => [id, field.value])));
}

export function editableFieldValues(fields, values) {
  return Object.freeze(Object.fromEntries([...fields]
    .filter(([, field]) => !field.readOnly)
    .map(([id]) => [id, values[id]])));
}

export function requireSemanticPatch(value, draftRevision, fields) {
  requireExactRecord(
    value,
    SEMANTIC_PATCH_FIELDS,
    'ANNOTATION_SEMANTIC_INSPECTOR_PATCH_INVALID',
    'Semantic Inspector patch',
  );
  if (value.expectedDraftRevision !== draftRevision) {
    failInteraction(
      'ANNOTATION_SEMANTIC_INSPECTOR_DRAFT_STALE',
      'Semantic Inspector draft revision is stale.',
    );
  }
  const field = fields.get(value.field);
  if (!field || field.readOnly || field.control?.kind !== 'number') {
    failInteraction(
      'ANNOTATION_SEMANTIC_INSPECTOR_FIELD_UNSUPPORTED',
      'Semantic Inspector field is not editable.',
    );
  }
  if (!Number.isFinite(value.value) || value.value < field.control.min
    || value.value > field.control.max) {
    failInteraction(
      'ANNOTATION_SEMANTIC_INSPECTOR_VALUE_INVALID',
      'Semantic Inspector value is outside its finite control bounds.',
    );
  }
  return Object.freeze({ field: value.field, value: Object.is(value.value, -0) ? 0 : value.value });
}
