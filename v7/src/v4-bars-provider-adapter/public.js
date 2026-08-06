/**
 * Owner: bar-data-runtime.
 * Purpose: expose the complete supported public contract for v4 bars provider.
 * Inputs: validated public values plus explicitly injected chart, provider, or host ports.
 * Outputs: a bounded adapter handle, staged result, or normalized external value.
 * Side effects: may call the adapted external engine only behind this facade and may mutate adapter-owned resources.
 * Lifecycle: created adapters own their external subscriptions and resources until dispose.
 * Errors: invalid input or external failures throw or reject with stable adapter errors.
 * Concurrency/cancellation: asynchronous adapter work honors cancellation and rejects stale or disposed application.
 */
export {
  createV4BarsAdapter,
  createV4BarsProvider,
  resolveV4BarsApiBase,
  V4_BARS_PROVIDER_ID,
} from './v4-bars-provider-adapter.js';
export {
  createV4ProjectedHistoryProvider,
  V4_PROJECTED_HISTORY_PROVIDER_ID,
} from './projected-history-adapter.js';
export { createV4MarketDateAvailability } from './market-date-availability.js';
export {
  exchangeWallSecondsToInstantMs,
  formatExchangeWallMinute,
} from './time-codec.js';
export {
  createNewYorkWallEpochConverter,
  newYorkWallEpochToInstantMs,
  toNewYorkWallEpoch,
} from './new-york-wall-clock.js';
