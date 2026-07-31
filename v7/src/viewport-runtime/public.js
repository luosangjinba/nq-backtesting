/**
 * Owner: viewport-runtime.
 * Purpose: expose the complete supported public contract for viewport runtime.
 * Inputs: validated commands, identities, configuration, and explicitly injected ports.
 * Outputs: owner handles, branded snapshots, receipts, or terminal results.
 * Side effects: stateful owners mutate only their own state and call explicitly injected ports.
 * Lifecycle: a created owner remains active until dispose when that operation is exposed.
 * Errors: invalid, stale, or disposed operations throw or reject with stable module errors.
 * Concurrency/cancellation: asynchronous work honors supplied cancellation and identity currency; stale results cannot commit.
 */
/** Public facade for pane-local, data-independent viewport intent semantics. */
export {
  createInitialViewportIntent,
  moveViewportIntentCursor,
  promoteViewportIntentToManual,
  readViewportIntent,
  resetViewportIntentToDefault,
  restoreViewportIntent,
} from './viewport-intent.js';
export { measureManualViewportWall, projectViewportIntent } from './logical-projection.js';
export { createViewportController } from './viewport-controller.js';
export { ViewportRuntimeError } from './viewport-error.js';
