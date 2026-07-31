/**
 * Owner: session-store.
 * Purpose: expose the complete supported public contract for session store.
 * Inputs: validated commands, identities, configuration, and explicitly injected ports.
 * Outputs: owner handles, branded snapshots, receipts, or terminal results.
 * Side effects: stateful owners mutate only their own state and call explicitly injected ports.
 * Lifecycle: a created owner remains active until dispose when that operation is exposed.
 * Errors: invalid, stale, or disposed operations throw or reject with stable module errors.
 * Concurrency/cancellation: asynchronous work honors supplied cancellation and identity currency; stale results cannot commit.
 */
export { createSessionStore } from './session-store.js';
export {
  createSessionRecord,
  deserializeSessionRecord,
  serializeSessionRecord,
  SessionStoreError,
} from './session-record.js';
