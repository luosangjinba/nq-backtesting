/**
 * Owner: data-acquisition-admin.
 * Purpose: expose the complete supported public contract for data acquisition ui.
 * Inputs: validated view models, DOM hosts, and explicitly supplied callback ports.
 * Outputs: a UI surface handle and its owned DOM root.
 * Side effects: mutates only its owned DOM subtree and invokes supplied callbacks.
 * Lifecycle: mounted listeners and DOM resources remain owned until dispose or unmount.
 * Errors: invalid hosts or view models throw; callback failures remain owned by the caller boundary.
 * Concurrency/cancellation: UI callbacks delegate asynchronous cancellation and stale-result checks to runtime owners.
 */
export { createDataAcquisitionSurface } from './surface.js';
export { createRollCalendarPanel, rollCalendarTemplate } from './roll-calendar-panel.js';
export {
  createAcquisitionWorkflow,
  parseOutputMetric,
} from './workflow-state.js';
export {
  createMaintenanceClient,
  resolveMaintenanceApiBase,
} from './maintenance-client.js';
export {
  createReadOnlyCoverageClient,
  resolveMarketDataApiBase,
} from './read-only-coverage-client.js';
