// Phase 9 calendar review boundaries.
// Calendar modules build derived day indexes from existing stores; they do not
// own or persist review objects.

export const CALENDAR_OBJECT_TYPES = Object.freeze({
  ORDER_SETUP: 'order-setup',
  PDA: 'pda',
  SEGMENT: 'segment',
  COMPOSITE: 'composite',
  SMT: 'smt',
});

export const CALENDAR_GROUP_ORDER = Object.freeze([
  CALENDAR_OBJECT_TYPES.ORDER_SETUP,
  CALENDAR_OBJECT_TYPES.SMT,
  CALENDAR_OBJECT_TYPES.PDA,
  CALENDAR_OBJECT_TYPES.SEGMENT,
  CALENDAR_OBJECT_TYPES.COMPOSITE,
]);

export const ORDER_SETUP_DAY_TIMESTAMP_PRIORITY = Object.freeze([
  'entryPlan.entryTimestamp',
  'setupThesis.primaryEventTimestamp',
  'resultReview.exitTimestamp',
]);

export function getCalendarGroupLabel(type) {
  if (type === CALENDAR_OBJECT_TYPES.ORDER_SETUP) return 'Order Setups';
  if (type === CALENDAR_OBJECT_TYPES.PDA) return 'PDA';
  if (type === CALENDAR_OBJECT_TYPES.SEGMENT) return 'Segments';
  if (type === CALENDAR_OBJECT_TYPES.COMPOSITE) return 'Composite';
  if (type === CALENDAR_OBJECT_TYPES.SMT) return 'SMT';
  return 'Objects';
}
