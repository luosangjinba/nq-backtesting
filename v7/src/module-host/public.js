/**
 * Owner: module-lifecycle.
 * Purpose: expose the complete supported public contract for module host.
 * Inputs: validated commands, identities, configuration, and explicitly injected ports.
 * Outputs: owner handles, branded snapshots, receipts, or terminal results.
 * Side effects: stateful owners mutate only their own state and call explicitly injected ports.
 * Lifecycle: a created owner remains active until dispose when that operation is exposed.
 * Errors: invalid, stale, or disposed operations throw or reject with stable module errors.
 * Concurrency/cancellation: asynchronous work honors supplied cancellation and identity currency; stale results cannot commit.
 */
/** Public module-lifecycle facade; imports behind this file remain private. */
export { ModuleHostError, normalizeModuleDefinition, normalizeModuleDescriptor } from './descriptor-contract.js';
export { planModuleAssembly } from './assembly-plan.js';
export { createModuleHost } from './module-host.js';
