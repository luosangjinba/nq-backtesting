/**
 * Owner: workspace-transaction-runtime.
 * Purpose: expose the complete supported public contract for replay navigation runtime.
 * Inputs: validated commands, identities, configuration, and explicitly injected ports.
 * Outputs: owner handles, branded snapshots, receipts, or terminal results.
 * Side effects: stateful owners mutate only their own state and call explicitly injected ports.
 * Lifecycle: a created owner remains active until dispose when that operation is exposed.
 * Errors: invalid, stale, or disposed operations throw or reject with stable module errors.
 * Concurrency/cancellation: asynchronous work honors supplied cancellation and identity currency; stale results cannot commit.
 */
/** Public facade for shared Replay actions over complete Pane-set transactions. */
export { createReplayNavigationExecutor } from './navigation-executor.js';
export { ReplayNavigationRuntimeError } from './navigation-error.js';
export {
  GOTO_TARGET_UNAVAILABLE_IN_RANGE,
  readReplayNavigationResult,
} from './navigation-result.js';
export {
  DEFAULT_REPLAY_NAVIGATION_ANCHORS,
  createReplayNavigationSchedule,
  requireReplayNavigationSchedule,
} from './navigation-schedule.js';
export { createReplayNavigationReplayPort } from './replay-port.js';
export { createReplayNavigationTargetResolver } from './target-resolver.js';
