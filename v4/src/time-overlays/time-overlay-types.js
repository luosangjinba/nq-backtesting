// Phase 9 time overlay boundaries.
// These helpers define visual overlay ownership only. They must not mutate PDA,
// Segment, SMT, or Order Review records.

export const TIME_OVERLAY_TIMEFRAME_LIMIT_MINUTES = 240;

export const TIME_OVERLAY_TYPES = Object.freeze({
  DAY_BOUNDARY: 'day-boundary',
  EVENT_TIME: 'event-time',
  KILLZONE: 'killzone',
});

export const DEFAULT_EVENT_TIME_COLOR = 'rgba(210, 86, 86, 0.20)';
export const DEFAULT_DAY_BOUNDARY_COLOR = 'rgba(120, 72, 72, 0.16)';
export const DEFAULT_WEEKLY_CLOSE_COLOR = 'rgba(210, 86, 86, 0.24)';
export const DEFAULT_KILLZONE_FILL_COLOR = 'rgba(255, 193, 7, 0.24)';
export const DEFAULT_KILLZONE_LINE_COLOR = 'rgba(255, 193, 7, 0.50)';
export const WEEKLY_CLOSE_TIME = '16:59';

export const DEFAULT_EVENT_TIMES = Object.freeze([]);

export const DEFAULT_KILLZONE = Object.freeze({
  enabled: false,
  label: 'Killzone',
  startTime: '09:30',
  endTime: '11:00',
  fillColor: DEFAULT_KILLZONE_FILL_COLOR,
  lineColor: DEFAULT_KILLZONE_LINE_COLOR,
});

export function isTimeOverlayTimeframe(currentTimeframe) {
  const parsed = Number(currentTimeframe);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= TIME_OVERLAY_TIMEFRAME_LIMIT_MINUTES;
}
