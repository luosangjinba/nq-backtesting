const REPLAY_WALL_MODE = 'replay-wall';

function normalizeNumber(value, fieldName, { allowNull = false, min = 0 } = {}) {
  if (allowNull && value === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) {
    throw new Error(`Viewport intent ${fieldName} must be a finite number >= ${min}.`);
  }
  return number;
}

function normalizeTimestamp(value, fieldName) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Viewport intent ${fieldName} must be a finite timestamp.`);
  }
  return timestamp;
}

function normalizeRevision(value = 0) {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 0) {
    throw new Error('Viewport intent revision must be a non-negative integer.');
  }
  return revision;
}

function createReplayWallIntent({
  cursorTimestamp,
  latestOffsetBars,
  origin,
  revision = 0,
  spanBars,
}) {
  if (origin !== 'default' && origin !== 'manual') {
    throw new Error('Viewport intent origin must be default or manual.');
  }

  return Object.freeze({
    cursorTimestamp: normalizeTimestamp(cursorTimestamp, 'cursorTimestamp'),
    latestOffsetBars: normalizeNumber(latestOffsetBars, 'latestOffsetBars'),
    mode: REPLAY_WALL_MODE,
    origin,
    revision: normalizeRevision(revision),
    spanBars: normalizeNumber(spanBars, 'spanBars', { allowNull: true, min: 1 }),
  });
}

export function createDefaultWallIntent({
  cursorTimestamp,
  latestOffsetBars = 8,
  revision = 0,
  spanBars = null,
} = {}) {
  return createReplayWallIntent({
    cursorTimestamp,
    latestOffsetBars,
    origin: 'default',
    revision,
    spanBars,
  });
}

export function createManualWallIntent({
  cursorTimestamp,
  latestOffsetBars,
  revision = 0,
  spanBars,
} = {}) {
  return createReplayWallIntent({
    cursorTimestamp,
    latestOffsetBars,
    origin: 'manual',
    revision,
    spanBars,
  });
}

export function updateIntentCursor(intent, cursorTimestamp) {
  if (!intent || intent.mode !== REPLAY_WALL_MODE) {
    throw new Error('Replay wall viewport intent is required.');
  }
  return Object.freeze({
    ...intent,
    cursorTimestamp: normalizeTimestamp(cursorTimestamp, 'cursorTimestamp'),
  });
}

export function resetToDefaultWallIntent(intent, {
  cursorTimestamp = intent?.cursorTimestamp,
  latestOffsetBars = intent?.latestOffsetBars ?? 8,
  spanBars = null,
} = {}) {
  return createDefaultWallIntent({
    cursorTimestamp,
    latestOffsetBars,
    revision: normalizeRevision(intent?.revision ?? 0) + 1,
    spanBars,
  });
}

export function promoteMeasuredRangeToManualIntent(intent, measurement = {}) {
  if (!intent || intent.mode !== REPLAY_WALL_MODE) {
    throw new Error('Replay wall viewport intent is required.');
  }
  return createManualWallIntent({
    cursorTimestamp: intent.cursorTimestamp,
    latestOffsetBars: measurement.latestOffsetBars,
    revision: intent.revision + 1,
    spanBars: measurement.spanBars,
  });
}
