/**
 * Owner: session-hours-domain.
 * Purpose: expose the complete supported public contract for session hours domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for pure Session Hours eligibility and source-backed traversal. */
export { createSessionHoursCalendar } from './calendar.js';
export { createSessionHoursPolicy, evaluateSessionHours } from './eligibility.js';
export { SessionHoursDomainError } from './session-hours-error.js';
export { resolveEligibleTraversal, resolveVisibleThrough } from './traversal.js';
export { decodeExchangeWallClock } from './wall-clock.js';
