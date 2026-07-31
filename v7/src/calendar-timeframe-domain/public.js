/**
 * Owner: projection-domain.
 * Purpose: expose the complete supported public contract for calendar timeframe domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for session-aware calendar alignment and OHLCV aggregation. */
export { createCalendarAggregationPolicy } from './aggregation-policy.js';
export { resolveCalendarPeriod } from './calendar-alignment.js';
export { projectCalendarBars } from './calendar-aggregation.js';
export { CalendarTimeframeDomainError } from './calendar-timeframe-error.js';
