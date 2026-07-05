function normalizeFinite(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error(`Viewport projection ${fieldName} must be finite.`);
  }
  return normalized;
}

function normalizePositive(value, fieldName) {
  const normalized = normalizeFinite(value, fieldName);
  if (normalized <= 0) {
    throw new Error(`Viewport projection ${fieldName} must be positive.`);
  }
  return normalized;
}

export function projectIntentToLogicalRange(intent, {
  defaultSpanBars = 120,
  latestLogicalIndex,
} = {}) {
  if (!intent || intent.mode !== 'replay-wall') {
    throw new Error('Replay wall viewport intent is required.');
  }

  const latestIndex = normalizeFinite(latestLogicalIndex, 'latestLogicalIndex');
  const latestOffsetBars = normalizeFinite(intent.latestOffsetBars, 'latestOffsetBars');
  const spanBars = intent.spanBars === null
    ? normalizePositive(defaultSpanBars, 'defaultSpanBars')
    : normalizePositive(intent.spanBars, 'spanBars');
  const to = latestIndex + latestOffsetBars;
  const from = to - spanBars;

  return Object.freeze({
    from,
    latestLogicalIndex: latestIndex,
    latestOffsetBars,
    origin: intent.origin,
    revision: intent.revision,
    spanBars,
    to,
  });
}

export function measureManualWallFromLogicalRange({
  latestLogicalIndex,
  range,
} = {}) {
  if (!range || typeof range !== 'object') {
    throw new Error('Viewport projection range is required.');
  }

  const latestIndex = normalizeFinite(latestLogicalIndex, 'latestLogicalIndex');
  const from = normalizeFinite(range.from, 'range.from');
  const to = normalizeFinite(range.to, 'range.to');
  if (to <= from) {
    throw new Error('Viewport projection range.to must be greater than range.from.');
  }

  return Object.freeze({
    latestOffsetBars: to - latestIndex,
    spanBars: to - from,
  });
}
