import { failLightweightAdapter } from './adapter-error.js';

export const FUTURE_TIME_AXIS_POINT_COUNT = 256;

/** Build adapter-only whitespace points; they add time-scale ticks, never OHLC. */
export function createFutureTimeAxisData({
  durationMs,
  latestDisplayEpochMs,
  pointCount = FUTURE_TIME_AXIS_POINT_COUNT,
}) {
  if (durationMs === null) return Object.freeze([]);
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0 || durationMs % 1_000 !== 0) {
    failLightweightAdapter(
      'CHART_FUTURE_TIME_AXIS_DURATION_INVALID',
      'Future time-axis points require one positive whole-second fixed duration.',
    );
  }
  if (!Number.isSafeInteger(latestDisplayEpochMs) || latestDisplayEpochMs < 0
    || latestDisplayEpochMs % 1_000 !== 0) {
    failLightweightAdapter(
      'CHART_FUTURE_TIME_AXIS_ORIGIN_INVALID',
      'Future time-axis points require one whole-second display origin.',
    );
  }
  if (!Number.isSafeInteger(pointCount) || pointCount < 1 || pointCount > 2_048) {
    failLightweightAdapter(
      'CHART_FUTURE_TIME_AXIS_COUNT_INVALID',
      'Future time-axis point count is outside the bounded adapter range.',
    );
  }
  return Object.freeze(Array.from({ length: pointCount }, (_, index) => {
    const epochMs = latestDisplayEpochMs + ((index + 1) * durationMs);
    if (!Number.isSafeInteger(epochMs)) {
      failLightweightAdapter(
        'CHART_FUTURE_TIME_AXIS_OVERFLOW',
        'Future time-axis point exceeds the safe timestamp range.',
      );
    }
    return Object.freeze({ time: epochMs / 1_000 });
  }));
}
