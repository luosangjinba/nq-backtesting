/**
 * Owner: core-moving-averages.
 * Purpose: expose one trusted-build Moving Averages package containing only SMA(close).
 * Inputs: validated P0a setting layers and immutable finite close/time arrays.
 * Outputs: exact manifest/Profile/Definition binding, one branded registration, normalized settings, and SMA points.
 * Side effects: none; the package has no Bar, Replay, Chart, DOM, storage, clock, network, or scheduling authority.
 * Lifecycle: one immutable registration is composed for an enabled ModuleHost generation and retained nowhere here.
 * Errors: stable package/contract failures reject forged registration, invalid settings, order, values, or length.
 * Concurrency/cancellation: pure synchronous full calculation; the trusted host executor owns cancellation and budgets.
 */
export {
  MOVING_AVERAGES_CONTRIBUTION_ID,
  MOVING_AVERAGES_DEFINITION_DIGEST,
  MOVING_AVERAGES_FORMULA_DIGEST,
  MOVING_AVERAGES_MODULE_ID,
  MOVING_AVERAGES_PACKAGE_DIGEST,
  MOVING_AVERAGES_PACKAGE_ID,
  MOVING_AVERAGES_PARAMETER_SCHEMA_DIGEST,
  MOVING_AVERAGES_PARAMETER_SCHEMA_ID,
  MOVING_AVERAGES_VERSION,
  SMA_CLOSE_DEFINITION_ID,
  TRUSTED_CALCULATED_SERIES_EXECUTOR,
} from './identities.js';
export { SMA_CLOSE_FORMULA_IDENTITY_WIRE } from './formula-identity.js';
export { MovingAveragesPackageError } from './package-error.js';
export {
  MOVING_AVERAGES_PARAMETER_SCHEMA,
  MOVING_AVERAGES_PARAMETER_SCHEMA_WIRE,
} from './parameter-schema.js';
export { MOVING_AVERAGES_PLUGIN_MANIFEST } from './plugin-manifest.js';
export {
  MOVING_AVERAGES_CALCULATED_SERIES_BINDING,
  SMA_CLOSE_DEFINITION,
  SMA_CLOSE_DEFINITION_WIRE,
} from './sma-definition.js';
export { calculateSmaClose, executeSmaCloseFormula } from './sma-formula.js';
export { normalizeMovingAveragesSettings } from './settings-normalizer.js';
export {
  createMovingAveragesRegistration,
  readTrustedCalculatedSeriesRegistration,
} from './registration.js';
