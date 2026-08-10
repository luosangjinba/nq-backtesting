import { failProjection } from './projection-error.js';

const INPUT_FIELDS = Object.freeze(['entityId', 'geometry', 'projectionId', 'revision']);
const STYLED_INPUT_FIELDS = Object.freeze([...INPUT_FIELDS, 'presentation']);
const GEOMETRY_FIELDS = Object.freeze(['payload', 'schemaVersion', 'typeId', 'typeVersion']);
const PRESENTATION_FIELDS = Object.freeze([
  'fillColor', 'fillOpacity', 'schemaVersion', 'strokeColor', 'strokeWidth',
]);
const LABELED_PRESENTATION_FIELDS = Object.freeze([...PRESENTATION_FIELDS, 'label']);
const LABEL_FIELDS = Object.freeze(['color', 'fontSize', 'text', 'visible']);
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const GEOMETRY_ID = /^geometry\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

class AnnotationProjectionValue {
  #snapshot;

  constructor(snapshot) {
    this.#snapshot = snapshot;
    Object.freeze(this);
  }

  read() { return this.#snapshot; }
}

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failProjection(code, `${label} fields must be exact.`);
  }
}

function portable(value, path, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      failProjection('ANNOTATION_PROJECTION_GEOMETRY_INVALID', `${path} must contain finite numbers.`);
    }
    return value;
  }
  if (!value || typeof value !== 'object') {
    failProjection('ANNOTATION_PROJECTION_GEOMETRY_INVALID', `${path} must be portable data.`);
  }
  if (ancestors.has(value)) {
    failProjection('ANNOTATION_PROJECTION_GEOMETRY_INVALID', `${path} must not contain cycles.`);
  }
  ancestors.add(value);
  let normalized;
  if (Array.isArray(value)) {
    normalized = Object.freeze(value.map((entry, index) => portable(entry, `${path}[${index}]`, ancestors)));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      failProjection('ANNOTATION_PROJECTION_GEOMETRY_INVALID', `${path} must use plain records.`);
    }
    normalized = Object.freeze(Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      portable(value[key], `${path}.${key}`, ancestors),
    ])));
  }
  ancestors.delete(value);
  return normalized;
}

function opaqueId(value, code, label) {
  if (typeof value !== 'string' || !OPAQUE_ID.test(value)) {
    failProjection(code, `${label} must be one opaque caller-allocated token.`);
  }
  return value;
}

function normalizeGeometry(value) {
  exactRecord(value, GEOMETRY_FIELDS, 'ANNOTATION_PROJECTION_GEOMETRY_INVALID', 'Geometry');
  if (value.schemaVersion !== 1 || typeof value.typeId !== 'string'
    || !GEOMETRY_ID.test(value.typeId) || typeof value.typeVersion !== 'string'
    || !VERSION.test(value.typeVersion)) {
    failProjection('ANNOTATION_PROJECTION_GEOMETRY_INVALID', 'Geometry envelope is invalid.');
  }
  return Object.freeze({
    payload: portable(value.payload, 'geometry.payload'),
    schemaVersion: 1,
    typeId: value.typeId,
    typeVersion: value.typeVersion,
  });
}

function normalizePresentation(value) {
  const fields = Object.hasOwn(value ?? {}, 'label')
    ? LABELED_PRESENTATION_FIELDS : PRESENTATION_FIELDS;
  exactRecord(
    value,
    fields,
    'ANNOTATION_PROJECTION_PRESENTATION_INVALID',
    'Presentation',
  );
  if (value.schemaVersion !== 1
    || !/^#[0-9a-f]{6}$/.test(value.strokeColor)
    || !/^#[0-9a-f]{6}$/.test(value.fillColor)
    || !Number.isFinite(value.strokeWidth) || value.strokeWidth < 1 || value.strokeWidth > 12
    || !Number.isFinite(value.fillOpacity) || value.fillOpacity < 0 || value.fillOpacity > 1) {
    failProjection(
      'ANNOTATION_PROJECTION_PRESENTATION_INVALID',
      'Presentation is outside the minimal Drawing style contract.',
    );
  }
  if (!Object.hasOwn(value, 'label')) return Object.freeze({ ...value });
  exactRecord(
    value.label,
    LABEL_FIELDS,
    'ANNOTATION_PROJECTION_LABEL_INVALID',
    'Projection label',
  );
  if (!/^#[0-9a-f]{6}$/.test(value.label.color)
    || !Number.isFinite(value.label.fontSize) || value.label.fontSize < 8
    || value.label.fontSize > 24 || typeof value.label.text !== 'string'
    || value.label.text.length < 1 || value.label.text.length > 64
    || typeof value.label.visible !== 'boolean') {
    failProjection(
      'ANNOTATION_PROJECTION_LABEL_INVALID',
      'Projection label is outside the bounded presentation contract.',
    );
  }
  return Object.freeze({ ...value, label: Object.freeze({ ...value.label }) });
}

/** Create one branded, deeply immutable, vendor-neutral accepted Annotation projection. */
export function createAnnotationProjection(value) {
  const fields = Object.hasOwn(value ?? {}, 'presentation')
    ? STYLED_INPUT_FIELDS : INPUT_FIELDS;
  exactRecord(value, fields, 'ANNOTATION_PROJECTION_INPUT_INVALID', 'Annotation projection');
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) {
    failProjection('ANNOTATION_PROJECTION_REVISION_INVALID', 'Projection revision must be positive.');
  }
  const snapshot = {
    entityId: opaqueId(value.entityId, 'ANNOTATION_PROJECTION_ENTITY_ID_INVALID', 'Entity id'),
    geometry: normalizeGeometry(value.geometry),
    projectionId: opaqueId(
      value.projectionId,
      'ANNOTATION_PROJECTION_ID_INVALID',
      'Projection id',
    ),
    revision: value.revision,
    schemaVersion: 1,
  };
  if (Object.hasOwn(value, 'presentation')) {
    snapshot.presentation = normalizePresentation(value.presentation);
  }
  return new AnnotationProjectionValue(Object.freeze(snapshot));
}

/** Read one branded Annotation projection without exposing mutable or vendor state. */
export function readAnnotationProjection(candidate) {
  if (!(candidate instanceof AnnotationProjectionValue)) {
    failProjection('ANNOTATION_PROJECTION_REQUIRED', 'A branded Annotation projection is required.');
  }
  return candidate.read();
}

/** Return one deterministic signature used only to detect revision collisions. */
export function annotationProjectionSignature(candidate) {
  return JSON.stringify(readAnnotationProjection(candidate));
}
