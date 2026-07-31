export const TARGET_HISTORY_DISPLAY_BARS = 240;

export function requireTargetDisplayBars(value = TARGET_HISTORY_DISPLAY_BARS) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError('Target display bars must be a positive safe integer.');
  }
  return value;
}

export function sourceBarsForDisplay({
  displayBars = TARGET_HISTORY_DISPLAY_BARS,
  durationMs,
  maximumSourceBars,
  minimumSourceBars,
  sourceDurationMs,
}) {
  return Math.min(
    maximumSourceBars,
    Math.max(
      minimumSourceBars,
      Math.ceil(durationMs / sourceDurationMs) * requireTargetDisplayBars(displayBars),
    ),
  );
}
