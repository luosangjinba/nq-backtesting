/**
 * Owner: calendar-surface.
 * Purpose: expose the complete supported public contract for calendar surface.
 * Inputs: validated view models, DOM hosts, and explicitly supplied callback ports.
 * Outputs: a UI surface handle and its owned DOM root.
 * Side effects: mutates only its owned DOM subtree and invokes supplied callbacks.
 * Lifecycle: mounted listeners and DOM resources remain owned until dispose or unmount.
 * Errors: invalid hosts or view models throw; callback failures remain owned by the caller boundary.
 * Concurrency/cancellation: UI callbacks delegate asynchronous cancellation and stale-result checks to runtime owners.
 */
/** Public Calendar Surface facade; consumers never import its DOM/model internals. */
export {
  createDateTimeControl,
  formatLocalDateTimeValue,
  parseLocalDateTimeValue,
} from './date-time-control.js';
export {
  calendarDateRangeState,
  createCalendarDateRange,
  createDecadePage,
  createLocalDate,
  createMonthGrid,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from './calendar-model.js';
