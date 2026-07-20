/** Public facade for pure Session Hours eligibility and source-backed traversal. */
export { createSessionHoursCalendar } from './calendar.js';
export { createSessionHoursPolicy, evaluateSessionHours } from './eligibility.js';
export { SessionHoursDomainError } from './session-hours-error.js';
export { resolveEligibleTraversal, resolveVisibleThrough } from './traversal.js';
export { decodeExchangeWallClock } from './wall-clock.js';
