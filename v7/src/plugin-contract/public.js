/**
 * Owner: plugin-contract.
 * Purpose: expose trusted-build plugin manifest, contribution, settings, plan, and status contracts.
 * Inputs: branded portable manifests/schemas, normalized module descriptors, host capabilities, and snapshots.
 * Outputs: immutable plans, effective settings, and read-only package status projections.
 * Side effects: none; this module never loads code, persists settings, renders DOM, or controls lifecycle.
 * Lifecycle: pure values remain usable independently; ModuleHost alone starts/stops/disposes modules.
 * Errors: PluginContractError fails malformed, incompatible, colliding, foreign, or unauthorized values closed.
 * Concurrency/cancellation: all operations are synchronous, deterministic, and retain no owner handles.
 */
export { PluginContractError } from './plugin-contract-error.js';
export {
  definePluginParameterSchema,
  readPluginParameterSchema,
  resolvePluginSettings,
} from './plugin-parameter-schema.js';
export {
  defineBuiltInPluginManifest,
  readBuiltInPluginManifest,
} from './plugin-manifest.js';
export {
  createBuiltInPluginPlan,
  listBuiltInPluginStatuses,
  readBuiltInPluginPlan,
} from './built-in-plugin-plan.js';
