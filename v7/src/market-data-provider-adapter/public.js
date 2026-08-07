/**
 * Owner: bar-data-runtime.
 * Purpose: expose V7's complete supported local market-data provider contract.
 * Inputs: validated public values plus explicitly injected chart, provider, or host ports.
 * Outputs: a bounded adapter handle, staged result, or normalized external value.
 * Side effects: may call the adapted external engine only behind this facade and may mutate adapter-owned resources.
 * Lifecycle: created adapters own their external subscriptions and resources until dispose.
 * Errors: invalid input or external failures throw or reject with stable adapter errors.
 * Concurrency/cancellation: asynchronous adapter work honors cancellation and rejects stale or disposed application.
 */
export {
  createMarketDataAdapter,
  createMarketDataProvider,
  resolveMarketDataApiBase,
  MARKET_DATA_PROVIDER_ID,
} from './market-data-provider-adapter.js';
export {
  createMarketDataProjectedHistoryProvider,
  MARKET_DATA_PROJECTED_HISTORY_PROVIDER_ID,
} from './projected-history-adapter.js';
export { createMarketDateAvailability } from './market-date-availability.js';
export {
  exchangeWallSecondsToInstantMs,
  formatExchangeWallMinute,
} from './time-codec.js';
export {
  createNewYorkWallEpochConverter,
  newYorkWallEpochToInstantMs,
  toNewYorkWallEpoch,
} from './new-york-wall-clock.js';
