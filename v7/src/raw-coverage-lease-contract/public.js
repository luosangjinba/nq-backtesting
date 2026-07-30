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
