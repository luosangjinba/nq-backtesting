import { MODULE_DEFINITION_INTERNALS, ModuleHostError } from './descriptor-contract.js';

const LIFECYCLE_METHODS = Object.freeze(['start', 'stop', 'dispose']);

/**
 * Owner: module-lifecycle.
 * Validates a newly-created module instance before any lifecycle method runs.
 * This blocks lifecycle behavior that is absent from, or hidden behind, the
 * machine-readable descriptor.
 */
export function normalizeModuleInstance(descriptor, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.hasOwn(value, 'publicApi')) {
    throw new ModuleHostError('INVALID_MODULE_INSTANCE', `${descriptor.id} returned an invalid instance.`);
  }
  if (!MODULE_DEFINITION_INTERNALS.isPublicApi(value.publicApi)) {
    throw new ModuleHostError('INVALID_PUBLIC_API', `${descriptor.id} returned an invalid publicApi.`);
  }
  for (const method of LIFECYCLE_METHODS) {
    const declared = descriptor.lifecycle.includes(method);
    const implemented = typeof value[method] === 'function';
    if (declared !== implemented) {
      throw new ModuleHostError(
        declared ? 'MISSING_LIFECYCLE_METHOD' : 'HIDDEN_LIFECYCLE_METHOD',
        `${descriptor.id}.${method} does not match its descriptor.`,
      );
    }
  }
  return Object.freeze({
    publicApi: value.publicApi,
    start: value.start,
    stop: value.stop,
    dispose: value.dispose,
  });
}
