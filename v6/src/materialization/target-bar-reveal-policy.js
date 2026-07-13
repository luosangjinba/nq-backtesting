function normalizeFiniteTimestamp(value, fieldName) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${fieldName} must be finite.`);
  }
  return timestamp;
}

function normalizeOptionalCursorTimestamp(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return normalizeFiniteTimestamp(value, 'Target bar materialization sourceCursorTimestamp');
}

export function resolveTargetBarRevealState({
  sourceCursorTimestamp = null,
  targetBar = {},
} = {}) {
  const cursorTimestamp = normalizeOptionalCursorTimestamp(sourceCursorTimestamp);
  const bucketStartTimestamp = normalizeFiniteTimestamp(
    targetBar.bucketStartTimestamp ?? targetBar.timestamp ?? targetBar.time,
    'Target bar materialization bucketStartTimestamp',
  );
  const bucketEndTimestamp = normalizeFiniteTimestamp(
    targetBar.bucketEndTimestamp ?? bucketStartTimestamp,
    'Target bar materialization bucketEndTimestamp',
  );
  if (bucketEndTimestamp < bucketStartTimestamp) {
    throw new Error('Target bar materialization bucketEndTimestamp must be after bucketStartTimestamp.');
  }

  if (cursorTimestamp === null) {
    return Object.freeze({
      bucketEndTimestamp,
      bucketStartTimestamp,
      complete: false,
      cursorCapped: true,
      reason: 'source-cursor-required-for-target-materialization',
      visible: false,
    });
  }

  if (cursorTimestamp < bucketStartTimestamp) {
    return Object.freeze({
      bucketEndTimestamp,
      bucketStartTimestamp,
      complete: false,
      cursorCapped: true,
      reason: 'target-bar-start-after-source-cursor',
      visible: false,
    });
  }

  if (cursorTimestamp < bucketEndTimestamp) {
    return Object.freeze({
      bucketEndTimestamp,
      bucketStartTimestamp,
      complete: false,
      cursorCapped: true,
      reason: 'source-cursor-inside-target-bucket',
      visible: false,
    });
  }

  return Object.freeze({
    bucketEndTimestamp,
    bucketStartTimestamp,
    complete: true,
    cursorCapped: false,
    reason: 'target-bar-complete-before-or-at-source-cursor',
    visible: true,
  });
}
