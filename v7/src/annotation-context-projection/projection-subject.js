import { failContextProjection } from './context-projection-error.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CAPABILITY = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const MAX_SOURCE_BARS = 32;

class AnnotationProjectionSubjectValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function portable(value, path, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      failContextProjection('PROJECTION_SUBJECT_PORTABLE_INVALID', `${path} must be finite.`);
    }
    return value;
  }
  if (!value || typeof value !== 'object' || ancestors.has(value)) {
    failContextProjection('PROJECTION_SUBJECT_PORTABLE_INVALID', `${path} must be acyclic portable data.`);
  }
  ancestors.add(value);
  let normalized;
  if (Array.isArray(value)) {
    normalized = Object.freeze(value.map((entry, index) => portable(
      entry,
      `${path}[${index}]`,
      ancestors,
    )));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      failContextProjection('PROJECTION_SUBJECT_PORTABLE_INVALID', `${path} must use plain records.`);
    }
    normalized = Object.freeze(Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      portable(value[key], `${path}.${key}`, ancestors),
    ])));
  }
  ancestors.delete(value);
  return normalized;
}

function sourceBar(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',')
      !== 'datasetRevision,endEpochMs,instrumentId,sourceTimeframeId,startEpochMs'
    || typeof value.datasetRevision !== 'string' || value.datasetRevision.length === 0
    || value.datasetRevision.length > 128
    || typeof value.instrumentId !== 'string' || !CAPABILITY.test(value.instrumentId)
    || typeof value.sourceTimeframeId !== 'string' || !CAPABILITY.test(value.sourceTimeframeId)
    || !Number.isSafeInteger(value.startEpochMs) || !Number.isSafeInteger(value.endEpochMs)
    || value.startEpochMs < 0 || value.startEpochMs >= value.endEpochMs) {
    failContextProjection('PROJECTION_SUBJECT_SOURCE_BAR_INVALID', 'Source Bar reference is invalid.');
  }
  return Object.freeze({ ...value });
}

/** Create one immutable Drawing-or-future-Artifact-neutral projection subject. */
export function createAnnotationProjectionSubject(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',')
      !== 'entityId,geometry,observedAtReplayCutoffEpochMs,policy,presentation,projectionId,revision,sourceBars'
    || typeof value.entityId !== 'string' || !ID.test(value.entityId)
    || typeof value.projectionId !== 'string' || !ID.test(value.projectionId)
    || !Number.isSafeInteger(value.revision) || value.revision < 1
    || !Number.isSafeInteger(value.observedAtReplayCutoffEpochMs)
    || value.observedAtReplayCutoffEpochMs < 0
    || !Array.isArray(value.sourceBars) || value.sourceBars.length > MAX_SOURCE_BARS
    || !value.policy || typeof value.policy !== 'object' || Array.isArray(value.policy)
    || Object.keys(value.policy).sort().join(',') !== 'policyId,version'
    || typeof value.policy.policyId !== 'string' || !CAPABILITY.test(value.policy.policyId)
    || typeof value.policy.version !== 'string' || !VERSION.test(value.policy.version)) {
    failContextProjection('PROJECTION_SUBJECT_INVALID', 'Projection subject is invalid.');
  }
  return new AnnotationProjectionSubjectValue(Object.freeze({
    entityId: value.entityId,
    geometry: portable(value.geometry, 'geometry'),
    observedAtReplayCutoffEpochMs: value.observedAtReplayCutoffEpochMs,
    policy: Object.freeze({ ...value.policy }),
    presentation: value.presentation === null ? null : portable(value.presentation, 'presentation'),
    projectionId: value.projectionId,
    revision: value.revision,
    sourceBars: Object.freeze(value.sourceBars.map(sourceBar)),
  }));
}

export function readAnnotationProjectionSubject(candidate) {
  if (!(candidate instanceof AnnotationProjectionSubjectValue)) {
    failContextProjection('PROJECTION_SUBJECT_REQUIRED', 'A branded projection subject is required.');
  }
  return candidate.read();
}
