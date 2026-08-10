import {
  AnnotationContextProjectionError,
  failContextProjection,
} from './context-projection-error.js';

const POLICY_ID = /^projection\.anchor\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

class AnchorProjectionPolicyDefinitionValue {
  #metadata;
  #project;

  constructor({ policyId, project, version }) {
    this.#metadata = Object.freeze({ policyId, version });
    this.#project = project;
    Object.freeze(this);
  }

  project(input) { return this.#project(input); }

  read() { return this.#metadata; }
}

function freezePortable(value, path, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || ancestors.has(value)) {
    failContextProjection('ANCHOR_POLICY_MAPPING_INVALID', `${path} must be acyclic portable data.`);
  }
  ancestors.add(value);
  let normalized;
  if (Array.isArray(value)) {
    normalized = Object.freeze(value.map((entry, index) => freezePortable(
      entry,
      `${path}[${index}]`,
      ancestors,
    )));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      failContextProjection('ANCHOR_POLICY_MAPPING_INVALID', `${path} must use plain records.`);
    }
    normalized = Object.freeze(Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      freezePortable(value[key], `${path}.${key}`, ancestors),
    ])));
  }
  ancestors.delete(value);
  return normalized;
}

/** Define one trusted, synchronous, source-agnostic anchor projection policy. */
export function defineAnchorProjectionPolicy(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'policyId,project,version') {
    failContextProjection('ANCHOR_POLICY_FIELDS_INVALID', 'Anchor policy fields must be exact.');
  }
  if (typeof value.policyId !== 'string' || !POLICY_ID.test(value.policyId)) {
    failContextProjection('ANCHOR_POLICY_ID_INVALID', 'Anchor policy id is invalid.');
  }
  if (typeof value.version !== 'string' || !VERSION.test(value.version)) {
    failContextProjection('ANCHOR_POLICY_VERSION_INVALID', 'Anchor policy version is invalid.');
  }
  if (typeof value.project !== 'function') {
    failContextProjection('ANCHOR_POLICY_PROJECTOR_INVALID', 'Anchor policy requires project().');
  }
  return new AnchorProjectionPolicyDefinitionValue(value);
}

export function readAnchorProjectionPolicy(candidate) {
  if (!(candidate instanceof AnchorProjectionPolicyDefinitionValue)) {
    failContextProjection('ANCHOR_POLICY_REQUIRED', 'A branded Anchor policy is required.');
  }
  return candidate.read();
}

export function requireAnchorProjectionPolicy(candidate) {
  readAnchorProjectionPolicy(candidate);
  return candidate;
}

export function invokeAnchorProjectionPolicy(candidate, input) {
  const definition = requireAnchorProjectionPolicy(candidate);
  const metadata = definition.read();
  let result;
  try { result = definition.project(input); } catch (cause) {
    if (cause instanceof AnnotationContextProjectionError) throw cause;
    failContextProjection(
      'ANCHOR_POLICY_EXECUTION_FAILED',
      `Anchor policy ${metadata.policyId} failed.`,
      { cause },
    );
  }
  if (result === null) return null;
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || Object.keys(result).sort().join(',') !== 'anchor,mapping'
    || !result.anchor || typeof result.anchor !== 'object' || Array.isArray(result.anchor)
    || !result.mapping || typeof result.mapping !== 'object' || Array.isArray(result.mapping)) {
    failContextProjection('ANCHOR_POLICY_RESULT_INVALID', 'Anchor policy result is invalid.');
  }
  return Object.freeze({
    anchor: freezePortable(result.anchor, 'anchor'),
    mapping: freezePortable({
      ...result.mapping,
      policyId: metadata.policyId,
      policyVersion: metadata.version,
    }, 'mapping'),
  });
}
