/**
 * Owner: workstation-settings.
 * Purpose: expose the complete supported public contract for workstation settings.
 * Inputs: validated commands, identities, configuration, and explicitly injected ports.
 * Outputs: owner handles, branded snapshots, receipts, or terminal results.
 * Side effects: stateful owners mutate only their own state and call explicitly injected ports.
 * Lifecycle: a created owner remains active until dispose when that operation is exposed.
 * Errors: invalid, stale, or disposed operations throw or reject with stable module errors.
 * Concurrency/cancellation: asynchronous work honors supplied cancellation and identity currency; stale results cannot commit.
 */
/** Public contract for the one global Workstation Settings owner. */
export {
  createWorkstationSettings,
  DEFAULT_WORKSTATION_SETTINGS,
  deserializeWorkstationSettings,
  readWorkstationSettings,
  serializeWorkstationSettings,
  workstationSettingsEqual,
} from './settings-value.js';
export { WorkstationSettingsError } from './settings-error.js';
export { createWorkstationSettingsRuntime } from './settings-runtime.js';
export { createColorHistoryStore } from './color-history-store.js';
export {
  hexColorOpacityPercent,
  hexColorWithOpacity,
  hexColorWithoutAlpha,
  isNormalizedHexAlphaColor,
  normalizeHexAlphaColor,
} from './color-value.js';
export {
  createPricePresentation,
  decimalPlacesForIncrement,
  resolvePricePrecision,
} from './price-presentation.js';
export { createTimePresentation } from './time-presentation.js';
