/**
 * Owner: replay-runtime.
 * Purpose: expose the complete supported public contract for replay prefetch contract.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public pure high/low-watermark Replay prefetch advice. */
export { adviseReplayPrefetch } from './prefetch-advice.js';
export { ReplayPrefetchContractError } from './prefetch-error.js';
export { createReplayPrefetchPolicy } from './prefetch-policy.js';
