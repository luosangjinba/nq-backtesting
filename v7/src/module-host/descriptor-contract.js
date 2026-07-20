const ALLOWED_KINDS = Object.freeze(['core', 'adapter', 'optional']);
const ALLOWED_LIFECYCLE = Object.freeze(['start', 'stop', 'dispose']);
const ID_PATTERN = /^(?:core|adapter|optional)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/** Stable public error for invalid module contracts and host operations. */
export class ModuleHostError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'ModuleHostError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ModuleHostError(code, message);
}

function isPublicApi(value) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function normalizePortList(value, field, moduleId) {
  if (!Array.isArray(value) || value.some((port) => typeof port !== 'string' || !ID_PATTERN.test(port))) {
    fail('INVALID_MODULE_DESCRIPTOR', `${moduleId}.${field} must contain valid module ids.`);
  }
  if (new Set(value).size !== value.length) {
    fail('DUPLICATE_MODULE_PORT', `${moduleId}.${field} contains a duplicate module id.`);
  }
  if (value.includes(moduleId)) fail('SELF_MODULE_DEPENDENCY', `${moduleId} cannot depend on itself.`);
  return Object.freeze([...value]);
}

/**
 * Owner: module-lifecycle.
 * Validates and freezes the complete public descriptor consumed by composition.
 * It performs no registration, import, allocation, or lifecycle side effect.
 */
export function normalizeModuleDescriptor(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_MODULE_DESCRIPTOR', 'Module descriptor must be an object.');
  }
  const id = value.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    fail('INVALID_MODULE_DESCRIPTOR', 'Module descriptor id is invalid.');
  }
  if (typeof value.version !== 'string' || !VERSION_PATTERN.test(value.version)) {
    fail('INVALID_MODULE_DESCRIPTOR', `${id}.version must be semantic x.y.z.`);
  }
  if (!ALLOWED_KINDS.includes(value.kind) || !id.startsWith(`${value.kind}.`)) {
    fail('INVALID_MODULE_KIND', `${id}.kind must match its id namespace.`);
  }
  for (const field of ['owner', 'publicEntry', 'independentHarness']) {
    if (typeof value[field] !== 'string' || value[field].length === 0) {
      fail('INVALID_MODULE_DESCRIPTOR', `${id}.${field} must be a non-empty string.`);
    }
  }
  if (typeof value.removable !== 'boolean' || (value.kind === 'optional' && !value.removable)) {
    fail('INVALID_MODULE_REMOVABILITY', `${id}.removable conflicts with its module kind.`);
  }
  const requiredPorts = normalizePortList(value.requiredPorts, 'requiredPorts', id);
  const optionalPorts = normalizePortList(value.optionalPorts, 'optionalPorts', id);
  if (requiredPorts.some((port) => optionalPorts.includes(port))) {
    fail('OVERLAPPING_MODULE_PORT', `${id} declares the same required and optional port.`);
  }
  if (!Array.isArray(value.lifecycle)
    || value.lifecycle.some((entry) => !ALLOWED_LIFECYCLE.includes(entry))
    || new Set(value.lifecycle).size !== value.lifecycle.length) {
    fail('INVALID_MODULE_LIFECYCLE', `${id}.lifecycle is invalid.`);
  }
  if (value.lifecycle.includes('start')
    && (!value.lifecycle.includes('stop') || !value.lifecycle.includes('dispose'))) {
    fail('INCOMPLETE_MODULE_LIFECYCLE', `${id} start requires stop and dispose.`);
  }
  return Object.freeze({
    id,
    version: value.version,
    kind: value.kind,
    owner: value.owner,
    publicEntry: value.publicEntry,
    requiredPorts,
    optionalPorts,
    lifecycle: Object.freeze([...value.lifecycle]),
    independentHarness: value.independentHarness,
    removable: value.removable,
  });
}

/**
 * Owner: module-lifecycle.
 * Binds one descriptor to either a static public API or an isolated factory.
 * Dynamic definitions must own disposal; hidden lifecycle methods are rejected
 * later when their instance exists.
 */
export function normalizeModuleDefinition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_MODULE_DEFINITION', 'Module definition must be an object.');
  }
  const descriptor = normalizeModuleDescriptor(value.descriptor);
  const hasStaticApi = Object.hasOwn(value, 'publicApi');
  const hasFactory = typeof value.instantiate === 'function';
  if (hasStaticApi === hasFactory) {
    fail('INVALID_MODULE_DEFINITION', `${descriptor.id} requires exactly one publicApi or instantiate.`);
  }
  if (hasStaticApi && descriptor.lifecycle.length > 0) {
    fail('STATIC_MODULE_HAS_LIFECYCLE', `${descriptor.id} static API cannot declare lifecycle.`);
  }
  if (hasStaticApi && !isPublicApi(value.publicApi)) {
    fail('INVALID_PUBLIC_API', `${descriptor.id} publicApi must be an object or function.`);
  }
  if (hasFactory && !descriptor.lifecycle.includes('dispose')) {
    fail('DYNAMIC_MODULE_MISSING_DISPOSE', `${descriptor.id} dynamic factory must declare dispose.`);
  }
  return Object.freeze({ descriptor, publicApi: value.publicApi, instantiate: value.instantiate });
}

export const MODULE_DEFINITION_INTERNALS = Object.freeze({ isPublicApi });
