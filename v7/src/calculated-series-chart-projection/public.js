/**
 * Owner: chart-runtime-adapter.
 * Purpose: validate complete calculated-series Pane surfaces and expose one removable Chart-owned child transaction factory.
 * Inputs: branded P1c.1 Definitions/documents/frames, host-created Chart bindings, and one bounded native surface port.
 * Outputs: branded candidates, preparations, receipts, deterministic limits, and an owner-bindable projection factory.
 * Side effects: only an injected adapter surface may mutate native resources after the Chart owner admits a preparation.
 * Lifecycle: one factory binds one Chart owner; preparations settle exactly and the bound surface disposes explicitly.
 * Errors: CalculatedSeriesChartProjectionError rejects stale, partial, forged, unsupported, failed, or out-of-phase work.
 * Concurrency/cancellation: one complete Pane-surface transaction at a time; no package callback or asynchronous calculation runs inside apply.
 */
export { CalculatedSeriesChartProjectionError } from './projection-error.js';
export {
  createCalculatedSeriesChartBinding,
  createCalculatedSeriesPaneSurfaceCandidate,
  readCalculatedSeriesChartBinding,
  readCalculatedSeriesPaneSurfaceCandidate,
} from './candidate-value.js';
export {
  createCalculatedSeriesChartProjectionFactory,
  requireCalculatedSeriesChartProjectionFactory,
} from './projection-port.js';
export {
  readCalculatedSeriesChartProjectionReceipt,
  readPreparedCalculatedSeriesChartProjection,
} from './prepared-surface.js';
export { CALCULATED_SERIES_CHART_PROJECTION_LIMITS } from './projection-plan.js';
