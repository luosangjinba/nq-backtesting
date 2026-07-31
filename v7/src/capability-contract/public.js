/**
 * Owner: module-registry.
 * Purpose: expose the complete supported public contract for capability contract.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public capability-contract facade; all descriptor creation is pure. */
export { CapabilityContractError } from './common-contract.js';
export { defineTimeframe } from './timeframe-definition.js';
export { defineMarketDataProvider } from './market-data-provider.js';
export { defineInstrument } from './instrument-definition.js';
export { defineTradingCalendar } from './trading-calendar.js';
export { defineIndicatorModule } from './indicator-module.js';
export { defineFormulaEngine } from './formula-engine.js';
export { createCapabilityCatalog } from './capability-catalog.js';
export { negotiateCapabilitySelection } from './capability-negotiation.js';
