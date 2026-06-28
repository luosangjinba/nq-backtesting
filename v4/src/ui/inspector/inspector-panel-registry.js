export const INSPECTOR_DETAIL_TYPES = Object.freeze({
  ORDER_SETUP: 'order-setup',
  LIVE_RECORD: 'live-record',
  PDA: 'pda',
  SEGMENT: 'segment',
  COMPOSITE: 'composite',
  SMT: 'smt',
  TIME_REACTION: 'time-reaction',
  ECONOMIC_EVENT: 'economic-event',
});

const DETAIL_TYPE_SET = new Set(Object.values(INSPECTOR_DETAIL_TYPES));

export function isInspectorDetailType(type) {
  return DETAIL_TYPE_SET.has(type);
}
