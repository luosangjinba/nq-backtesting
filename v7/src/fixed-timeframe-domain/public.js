/**
 * Owner: projection-domain.
 * Purpose: expose the complete supported public contract for fixed timeframe domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for canonical fixed-duration alignment and OHLCV aggregation. */
export { createFixedDurationAggregationPolicy } from './aggregation-policy.js';
export { resolveFixedBucketStart } from './bucket-alignment.js';
export { FixedTimeframeDomainError } from './fixed-timeframe-error.js';
export { projectFixedDurationBars } from './fixed-duration-aggregation.js';
