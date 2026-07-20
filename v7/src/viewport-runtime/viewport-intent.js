import { createViewportPaneScope } from './pane-scope.js';
import { failViewport } from './viewport-error.js';

const MODE = 'replay-wall';

class ViewportIntentValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

function requireCursorEpochMs(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failViewport('VIEWPORT_CURSOR_INVALID', 'Viewport cursor must be a non-negative safe epoch.');
  }
  return value;
}

function requireOffset(value, origin) {
  if (!Number.isFinite(value) || (origin === 'default' && value < 0)) {
    failViewport(
      'VIEWPORT_OFFSET_INVALID',
      'Latest-bar offset must be finite and may be negative only for a manual viewport.',
    );
  }
  return value;
}

function requireSpan(value, origin) {
  if (origin === 'default' && value === null) return null;
  if (origin === 'manual' && Number.isFinite(value) && value > 0) return value;
  failViewport('VIEWPORT_SPAN_INVALID', 'Default span must be null and manual span must be positive.');
}

function requireRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failViewport('VIEWPORT_REVISION_INVALID', 'Viewport revision must be a non-negative safe integer.');
  }
  return value;
}

function createIntent({ cursorEpochMs, latestOffsetBars, origin, revision, scope, spanBars }) {
  if (origin !== 'default' && origin !== 'manual') {
    failViewport('VIEWPORT_ORIGIN_INVALID', 'Viewport origin must be default or manual.');
  }
  return new ViewportIntentValue({
    cursorEpochMs: requireCursorEpochMs(cursorEpochMs),
    latestOffsetBars: requireOffset(latestOffsetBars, origin),
    mode: MODE,
    origin,
    revision: requireRevision(revision),
    scope,
    spanBars: requireSpan(spanBars, origin),
  });
}

/** Read the immutable semantic value from a branded viewport intent. */
export function readViewportIntent(candidate) {
  if (!(candidate instanceof ViewportIntentValue)) {
    failViewport('VIEWPORT_INTENT_REQUIRED', 'A branded viewport intent is required.');
  }
  return candidate.read();
}

/** Create the only implicit default intent: initial pane activation. */
export function createInitialViewportIntent({
  activationGeneration,
  cursorEpochMs,
  latestOffsetBars,
  paneId,
  sessionId,
}) {
  return createIntent({
    cursorEpochMs,
    latestOffsetBars,
    origin: 'default',
    revision: 0,
    scope: createViewportPaneScope({ activationGeneration, paneId, sessionId }),
    spanBars: null,
  });
}

function nextRevision(revision) {
  if (revision === Number.MAX_SAFE_INTEGER) {
    failViewport('VIEWPORT_REVISION_EXHAUSTED', 'Viewport revision is exhausted.');
  }
  return revision + 1;
}

/** Preserve wall semantics while Replay moves to any accepted cursor. */
export function moveViewportIntentCursor(intent, cursorEpochMs) {
  const value = readViewportIntent(intent);
  return createIntent({ ...value, cursorEpochMs });
}

/** Promote one native logical-range measurement to pane-local manual intent. */
export function promoteViewportIntentToManual(intent, measurement) {
  const value = readViewportIntent(intent);
  return createIntent({
    ...value,
    latestOffsetBars: requireOffset(measurement?.latestOffsetBars, 'manual'),
    origin: 'manual',
    revision: nextRevision(value.revision),
    spanBars: requireSpan(measurement?.spanBars, 'manual'),
  });
}

/** Explicit Reset/Follow is the sole transition from an existing intent to default. */
export function resetViewportIntentToDefault(intent, { latestOffsetBars }) {
  const value = readViewportIntent(intent);
  return createIntent({
    ...value,
    latestOffsetBars,
    origin: 'default',
    revision: nextRevision(value.revision),
    spanBars: null,
  });
}
