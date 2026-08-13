/**
 * Owner: chart-runtime-adapter.
 * Purpose: expose the complete supported public contract for chart snapshot application.
 * Inputs: validated commands, identities, configuration, and explicitly injected ports.
 * Outputs: owner handles, branded snapshots, receipts, or terminal results.
 * Side effects: stateful owners mutate only their own state and call explicitly injected ports.
 * Lifecycle: a created owner remains active until dispose when that operation is exposed.
 * Errors: invalid, stale, or disposed operations throw or reject with stable module errors.
 * Concurrency/cancellation: asynchronous work honors supplied cancellation and identity currency; stale results cannot commit.
 */
/** Public facade for atomic application of projected chart snapshots. */
export {
  createChartSnapshotApplication,
  createPaneSetChartSnapshotApplication,
} from './chart-snapshot-application.js';
export { ChartSnapshotApplicationError } from './application-error.js';
export { createChartAdapterVisibleReceipt } from './adapter-receipt.js';
export { requireProjectedPaneSetSnapshot } from './pane-set-snapshot-contract.js';
export { requirePreparedChartApplication } from './prepared-chart-application.js';
export {
  createChartCalculatedSeriesProjectionOwner,
  requireChartCalculatedSeriesProjectionControls,
} from './calculated-series-projection-owner.js';
