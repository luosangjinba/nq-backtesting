import { failSemanticPackage } from './semantic-package-error.js';
import { exactRecord, portableValue } from './portable-value.js';

const ID = /^[a-z][A-Za-z0-9.-]{0,63}$/;
const SOURCES = new Set(['AUTO', 'LOCKED', 'MANUAL', 'OVERRIDDEN']);
const MAX_GROUPS = 8;
const MAX_FIELDS = 32;

function boundedText(value, label) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 96) {
    failSemanticPackage('SEMANTIC_INSPECTOR_SCHEMA_INVALID', `${label} is invalid.`);
  }
  return value;
}

function numberControl(value) {
  exactRecord(
    value,
    ['kind', 'max', 'min'],
    'SEMANTIC_INSPECTOR_SCHEMA_INVALID',
    'Inspector number control',
  );
  if (value.kind !== 'number' || !Number.isFinite(value.min)
    || !Number.isFinite(value.max) || value.min > value.max) {
    failSemanticPackage('SEMANTIC_INSPECTOR_SCHEMA_INVALID', 'Inspector number control is invalid.');
  }
  return Object.freeze({ kind: 'number', max: value.max, min: value.min });
}

function normalizeField(value) {
  const hasBaseline = Object.hasOwn(value ?? {}, 'baselineValue');
  const hasControl = Object.hasOwn(value ?? {}, 'control');
  const fields = ['id', 'label', 'readOnly', 'source', 'value'];
  if (hasBaseline) fields.push('baselineValue');
  if (hasControl) fields.push('control');
  exactRecord(
    value,
    fields,
    'SEMANTIC_INSPECTOR_SCHEMA_INVALID',
    'Inspector field',
  );
  if (typeof value.id !== 'string' || !ID.test(value.id)
    || typeof value.readOnly !== 'boolean' || !SOURCES.has(value.source)
    || (!value.readOnly && (!hasBaseline || !hasControl))
    || (hasControl && value.readOnly)) {
    failSemanticPackage('SEMANTIC_INSPECTOR_SCHEMA_INVALID', 'Inspector field is invalid.');
  }
  const normalized = {
    id: value.id,
    label: boundedText(value.label, 'Inspector field label'),
    readOnly: value.readOnly,
    source: value.source,
    value: portableValue(value.value, `inspector.${value.id}.value`),
  };
  if (hasBaseline) {
    normalized.baselineValue = portableValue(
      value.baselineValue,
      `inspector.${value.id}.baselineValue`,
    );
  }
  if (hasControl) normalized.control = numberControl(value.control);
  return Object.freeze(normalized);
}

/** Validate one bounded package-authored schema before any host renderer consumes it. */
export function normalizeArtifactInspectionGroups(value) {
  if (!Array.isArray(value) || value.length > MAX_GROUPS) {
    failSemanticPackage('SEMANTIC_INSPECTOR_SCHEMA_INVALID', 'Inspector groups are invalid.');
  }
  const fieldIds = new Set();
  let fieldCount = 0;
  const groups = value.map((group) => {
    exactRecord(
      group,
      ['fields', 'id', 'label'],
      'SEMANTIC_INSPECTOR_SCHEMA_INVALID',
      'Inspector group',
    );
    if (typeof group.id !== 'string' || !ID.test(group.id) || !Array.isArray(group.fields)) {
      failSemanticPackage('SEMANTIC_INSPECTOR_SCHEMA_INVALID', 'Inspector group is invalid.');
    }
    const fields = group.fields.map((candidate) => {
      const normalized = normalizeField(candidate);
      fieldCount += 1;
      if (fieldCount > MAX_FIELDS || fieldIds.has(normalized.id)) {
        failSemanticPackage(
          'SEMANTIC_INSPECTOR_SCHEMA_INVALID',
          'Inspector field ids must be unique and bounded.',
        );
      }
      fieldIds.add(normalized.id);
      return normalized;
    });
    return Object.freeze({
      fields: Object.freeze(fields),
      id: group.id,
      label: boundedText(group.label, 'Inspector group label'),
    });
  });
  if (new Set(groups.map(({ id }) => id)).size !== groups.length) {
    failSemanticPackage('SEMANTIC_INSPECTOR_SCHEMA_INVALID', 'Inspector group ids must be unique.');
  }
  return Object.freeze(groups);
}

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
