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
