/**
 * Owner: chart-runtime-adapter.
 * Purpose: expose the complete supported public contract for lightweight chart.
 * Inputs: validated public values plus explicitly injected chart, provider, or host ports.
 * Outputs: a bounded adapter handle, staged result, or normalized external value.
 * Side effects: may call the adapted external engine only behind this facade and may mutate adapter-owned resources.
 * Lifecycle: created adapters own their external subscriptions and resources until dispose.
 * Errors: invalid input or external failures throw or reject with stable adapter errors.
 * Concurrency/cancellation: asynchronous adapter work honors cancellation and rejects stale or disposed application.
 */
/** Public browser adapter facade; all Lightweight Charts calls stay behind it. */
export { createLightweightChartAdapter } from './lightweight-chart-adapter.js';
export { createLightweightPaneSetAdapter } from './pane-set-adapter.js';
export { LightweightChartAdapterError } from './adapter-error.js';
