/** Public module-lifecycle facade; imports behind this file remain private. */
export { ModuleHostError, normalizeModuleDefinition, normalizeModuleDescriptor } from './descriptor-contract.js';
export { planModuleAssembly } from './assembly-plan.js';
export { createModuleHost } from './module-host.js';
