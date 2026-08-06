/**
 * Owner: session-state-replication.
 * Purpose: expose optional local-first replication without changing Session Store ownership.
 * Inputs: explicit fetch, Web Storage, Web Crypto, reload, and clock ports.
 * Outputs: initialized synchronized storage plus observable sync/conflict controls.
 * Side effects: reads/writes allowlisted local storage and one bounded state endpoint.
 * Lifecycle: initialize before Session owners; flush and dispose after they stop.
 * Errors: invalid ports throw; network failures become explicit local/offline state;
 * unprovable local rollback throws reload-required and poisons the adapter.
 * Concurrency/Cancellation: serialized snapshot PUTs use revision CAS; stale writers conflict.
 */
export { createServerStateSync } from './state-sync-client.js';
