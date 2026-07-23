import { failLightweightAdapter } from './adapter-error.js';

function finite(value, code, message) {
  if (!Number.isFinite(value)) failLightweightAdapter(code, message);
  return value;
}

function increasingRange(range) {
  const from = finite(
    range?.from,
    'CHART_TIME_POINT_RANGE_INVALID',
    'Time-point projection requires a finite visible-range start.',
  );
  const to = finite(
    range?.to,
    'CHART_TIME_POINT_RANGE_INVALID',
    'Time-point projection requires a finite visible-range end.',
  );
  if (to <= from) {
    failLightweightAdapter(
      'CHART_TIME_POINT_RANGE_INVALID',
      'Time-point projection requires an increasing visible range.',
    );
  }
  return Object.freeze({ from, to });
}

function requireEpoch(value, code, message) {
  if (!Number.isSafeInteger(value) || value < 0) failLightweightAdapter(code, message);
  return value;
}

function requirePosition(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    failLightweightAdapter(
      'CHART_TIME_POINT_POSITION_INVALID',
      'Time-point position must be a finite ratio between zero and one.',
    );
  }
  return value;
}

function logicalIndexAt(timelineEpochMs, targetEpochMs, maximumProjectableEpochMs) {
  if (!Array.isArray(timelineEpochMs) || timelineEpochMs.length === 0) return null;
  let previous = -1;
  for (const epochMs of timelineEpochMs) {
    requireEpoch(
      epochMs,
      'CHART_TIME_POINT_TIMELINE_INVALID',
      'Time-point timeline entries must be non-negative safe epochs.',
    );
    if (epochMs <= previous) {
      failLightweightAdapter(
        'CHART_TIME_POINT_TIMELINE_INVALID',
        'Time-point timeline entries must increase strictly.',
      );
    }
    previous = epochMs;
  }
  if (targetEpochMs < timelineEpochMs[0]) return null;
  if (targetEpochMs > timelineEpochMs.at(-1)) {
    return maximumProjectableEpochMs !== null && targetEpochMs <= maximumProjectableEpochMs
      ? timelineEpochMs.length - 1
      : null;
  }

  let low = 0;
  let high = timelineEpochMs.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const epochMs = timelineEpochMs[middle];
    if (epochMs === targetEpochMs) return middle;
    if (epochMs < targetEpochMs) low = middle + 1;
    else high = middle - 1;
  }

  const leftIndex = high;
  const rightIndex = low;
  const leftEpochMs = timelineEpochMs[leftIndex];
  const rightEpochMs = timelineEpochMs[rightIndex];
  return leftIndex + ((targetEpochMs - leftEpochMs) / (rightEpochMs - leftEpochMs));
}

/**
 * Convert one native click into a stable time/position observation. Logical
 * coordinates remain adapter-local and are never exposed as product state.
 */
export function observeTimePointClick({ displayEpochMs, logical, visibleRange }) {
  if (!Number.isSafeInteger(displayEpochMs) || displayEpochMs < 0 || !Number.isFinite(logical)) {
    return null;
  }
  let range;
  try {
    range = increasingRange(visibleRange);
  } catch {
    return null;
  }
  const positionRatio = Math.min(1, Math.max(0, (logical - range.from) / (range.to - range.from)));
  return Object.freeze({ displayEpochMs, positionRatio });
}

/**
 * Preserve the target Pane span while placing one semantic time at the same
 * horizontal ratio as the source click. Missing target history is a bounded
 * no-op; this adapter projection never requests bars or moves Replay.
 */
export function planTimePointProjection({
  displayEpochMs,
  maximumProjectableEpochMs = null,
  positionRatio,
  timelineEpochMs,
  visibleRange,
}) {
  const targetEpochMs = requireEpoch(
    displayEpochMs,
    'CHART_TIME_POINT_EPOCH_INVALID',
    'Time-point projection requires a non-negative safe epoch.',
  );
  const position = requirePosition(positionRatio);
  const maximumEpochMs = maximumProjectableEpochMs === null
    ? null
    : requireEpoch(
      maximumProjectableEpochMs,
      'CHART_TIME_POINT_MAXIMUM_INVALID',
      'Time-point projection maximum must be a non-negative safe epoch.',
    );
  const range = increasingRange(visibleRange);
  const logical = logicalIndexAt(timelineEpochMs, targetEpochMs, maximumEpochMs);
  if (logical === null) return null;
  const spanBars = range.to - range.from;
  const from = logical - (position * spanBars);
  return Object.freeze({
    displayEpochMs: targetEpochMs,
    from,
    logical,
    positionRatio: position,
    spanBars,
    to: from + spanBars,
  });
}
