// Phase 9 time overlay boundaries.
// These helpers define visual overlay ownership only. They must not mutate PDA,
// Segment, SMT, or Order Review records.

export const TIME_OVERLAY_TIMEFRAME_LIMIT_MINUTES = 240;

export const TIME_OVERLAY_TYPES = Object.freeze({
  DAY_BOUNDARY: 'day-boundary',
  EVENT_TIME: 'event-time',
  KILLZONE: 'killzone',
});

export const DEFAULT_EVENT_TIMES = Object.freeze(['09:30', '09:50', '10:00']);

export const DEFAULT_KILLZONE = Object.freeze({
  enabled: false,
  label: 'Killzone',
  startTime: '09:30',
  endTime: '11:00',
});

export function isTimeOverlayTimeframe(currentTimeframe) {
  const parsed = Number(currentTimeframe);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= TIME_OVERLAY_TIMEFRAME_LIMIT_MINUTES;
}
