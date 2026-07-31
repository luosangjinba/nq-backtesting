/**
 * Owner: bar-data-runtime.
 * Purpose: expose the complete supported public contract for raw coverage lease contract.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/**
 * Public transaction-scoped Raw Coverage Lease facade.
 *
 * This contract defines bounded raw coverage and revocable synchronous access.
 * It performs no provider I/O, cache ownership, projection, Replay, chart, or UI
 * work and never retains a raw batch outside an active read-view callback.
 */
export {
  RawCoverageLeaseContractError,
} from './contract-error.js';
export {
  createRawCoverageLeasePolicy,
  createRawCoverageLeaseScope,
  requireRawCoverageLeaseScope,
} from './scope-contract.js';
export { createRawCoverageLease } from './lease-contract.js';
