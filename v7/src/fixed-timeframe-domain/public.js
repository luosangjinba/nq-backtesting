/** Public facade for canonical fixed-duration alignment and OHLCV aggregation. */
export { createFixedDurationAggregationPolicy } from './aggregation-policy.js';
export { resolveFixedBucketStart } from './bucket-alignment.js';
export { FixedTimeframeDomainError } from './fixed-timeframe-error.js';
export { projectFixedDurationBars } from './fixed-duration-aggregation.js';
