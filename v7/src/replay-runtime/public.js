/**
 * Owner: replay-runtime.
 * Purpose: expose the complete supported public contract for replay runtime.
 * Inputs: validated commands, identities, configuration, and explicitly injected ports.
 * Outputs: owner handles, branded snapshots, receipts, or terminal results.
 * Side effects: stateful owners mutate only their own state and call explicitly injected ports.
 * Lifecycle: a created owner remains active until dispose when that operation is exposed.
 * Errors: invalid, stale, or disposed operations throw or reject with stable module errors.
 * Concurrency/cancellation: asynchronous work honors supplied cancellation and identity currency; stale results cannot commit.
 */
/** Public factory for the single clock owned by one activated Session generation. */
export { createReplayRuntime } from './replay-runtime.js';
export { requirePreparedReplayCommit } from './prepared-replay-commit.js';
export { ReplayRuntimeError } from './runtime-error.js';
