/** Public contract for the one global Workstation Settings owner. */
export {
  createWorkstationSettings,
  DEFAULT_WORKSTATION_SETTINGS,
  deserializeWorkstationSettings,
  readWorkstationSettings,
  serializeWorkstationSettings,
  WorkstationSettingsError,
  workstationSettingsEqual,
} from './settings-value.js';
export { createWorkstationSettingsRuntime } from './settings-runtime.js';
export {
  createPricePresentation,
  decimalPlacesForIncrement,
  resolvePricePrecision,
} from './price-presentation.js';
