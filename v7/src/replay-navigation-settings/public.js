/**
 * Owner: replay-navigation-runtime.
 * Purpose: expose the complete supported public contract for replay navigation settings.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public pure contract for durable Session-level quick-GoTo wall times. */
export {
  createReplayNavigationSettings,
  DEFAULT_REPLAY_NAVIGATION_SETTINGS,
  deserializeReplayNavigationSettings,
  readReplayNavigationSettings,
  ReplayNavigationSettingsError,
  serializeReplayNavigationSettings,
} from './navigation-settings.js';
