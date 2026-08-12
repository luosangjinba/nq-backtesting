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
  validatePluginSettings,
} from './plugin-parameter-schema.js';
export {
  defineBuiltInPluginManifest,
  readBuiltInPluginManifest,
} from './plugin-manifest.js';
export {
  defineLocalPluginPackageManifest,
  finalizeLocalPluginPackageManifest,
  LOCAL_PLUGIN_CONTRACT_PROFILE,
  readLocalPluginPackageManifest,
} from './local-plugin-package-manifest.js';
export {
  createLocalPluginPackageCandidatePlan,
  readLocalPluginPackageCandidatePlan,
} from './local-plugin-package-plan.js';
export {
  createLocalPluginSettingsState,
  migrateLocalPluginSettingsState,
  readLocalPluginSettingsState,
} from './local-plugin-settings-migration.js';
export {
  prepareLocalPluginPackageChange,
  readLocalPluginPackageChangePreparation,
} from './local-plugin-package-change.js';
export {
  createBuiltInPluginPlan,
  listBuiltInPluginStatuses,
  readBuiltInPluginPlan,
} from './built-in-plugin-plan.js';
export {
  CORE_PLUGIN_PROFILE_RECORD_SCHEMA,
  CORE_PLUGIN_PROFILE_RECORD_VERSION,
  corePluginProfilesEqual,
  createCorePluginProfileRecord,
  createDefaultCorePluginProfile,
  createKernelSafeCorePluginProfile,
  deserializeCorePluginProfileRecord,
  inspectStoredCorePluginProfile,
  normalizeCorePluginProfile,
  readCorePluginProfileRecord,
  serializeCorePluginProfileRecord,
} from './core-plugin-profile-value.js';
export {
  prepareCorePluginProfileChange,
  readCorePluginChangePreparation,
} from './core-plugin-change-plan.js';
export { planCorePluginApplicationImpact } from './core-plugin-application-impact.js';
export {
  createCorePluginBootFailure,
  createCorePluginBootSelection,
} from './core-plugin-boot-selection.js';
export { createCorePluginCatalogSnapshot } from './core-plugin-status.js';
