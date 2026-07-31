/**
 * Owner: bar-data-runtime.
 * Purpose: expose the complete supported public contract for bar data runtime.
 * Inputs: validated commands, identities, configuration, and explicitly injected ports.
 * Outputs: owner handles, branded snapshots, receipts, or terminal results.
 * Side effects: stateful owners mutate only their own state and call explicitly injected ports.
 * Lifecycle: a created owner remains active until dispose when that operation is exposed.
 * Errors: invalid, stale, or disposed operations throw or reject with stable module errors.
 * Concurrency/cancellation: asynchronous work honors supplied cancellation and identity currency; stale results cannot commit.
 */
/** Public bounded raw Bar Data Runtime factory; provider adapters are injected. */
export { BarDataRuntimeError } from './runtime-error.js';
export { createBarDataRuntime } from './bar-data-runtime.js';
export { createProjectedHistoryRuntime } from './projected-history-runtime.js';
