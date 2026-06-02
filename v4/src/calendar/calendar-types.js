// Phase 9 calendar review boundaries.
// Calendar modules build derived day indexes from existing stores; they do not
// own or persist review objects.

export const CALENDAR_OBJECT_TYPES = Object.freeze({
  ORDER_SETUP: 'order-setup',
  TIME_REACTION: 'time-reaction',
  ECONOMIC_EVENT: 'economic-event',
  PDA: 'pda',
  SEGMENT: 'segment',
  COMPOSITE: 'composite',
  SMT: 'smt',
  KILLZONE: 'killzone',
  TIME_LINE: 'time-line',
});

export const CALENDAR_GROUP_ORDER = Object.freeze([
  CALENDAR_OBJECT_TYPES.ORDER_SETUP,
  CALENDAR_OBJECT_TYPES.TIME_REACTION,
  CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT,
  CALENDAR_OBJECT_TYPES.SMT,
  CALENDAR_OBJECT_TYPES.PDA,
  CALENDAR_OBJECT_TYPES.SEGMENT,
  CALENDAR_OBJECT_TYPES.COMPOSITE,
  CALENDAR_OBJECT_TYPES.KILLZONE,
  CALENDAR_OBJECT_TYPES.TIME_LINE,
]);

export const ORDER_SETUP_DAY_TIMESTAMP_PRIORITY = Object.freeze([
  'entryPlan.entryTimestamp',
  'setupThesis.primaryEventTimestamp',
  'resultReview.exitTimestamp',
]);

export function getCalendarGroupLabel(type) {
  if (type === CALENDAR_OBJECT_TYPES.ORDER_SETUP) return 'Order Setups';
  if (type === CALENDAR_OBJECT_TYPES.TIME_REACTION) return 'Time Reaction Observation';
  if (type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT) return 'Economic Events';
  if (type === CALENDAR_OBJECT_TYPES.PDA) return 'PDA';
  if (type === CALENDAR_OBJECT_TYPES.SEGMENT) return 'Segments';
  if (type === CALENDAR_OBJECT_TYPES.COMPOSITE) return 'Composite';
  if (type === CALENDAR_OBJECT_TYPES.SMT) return 'SMT';
  if (type === CALENDAR_OBJECT_TYPES.KILLZONE) return 'Killzones / Time Lines';
  if (type === CALENDAR_OBJECT_TYPES.TIME_LINE) return 'Killzones / Time Lines';
  return 'Objects';
}
