import { readViewportIntent } from './viewport-intent.js';
import { failViewport } from './viewport-error.js';

function requireFinite(value, code, message) {
  if (!Number.isFinite(value)) failViewport(code, message);
  return value;
}

function requirePositive(value, code, message) {
  requireFinite(value, code, message);
  if (value <= 0) failViewport(code, message);
  return value;
}

/** Convert an engine-native logical range into durable wall semantics. */
export function measureManualViewportWall({ latestLogicalIndex, range }) {
  const latest = requireFinite(
    latestLogicalIndex,
    'VIEWPORT_LATEST_INDEX_INVALID',
    'Latest logical index must be finite.',
  );
  if (!range || typeof range !== 'object') {
    failViewport('VIEWPORT_LOGICAL_RANGE_INVALID', 'A logical range is required.');
  }
  const from = requireFinite(range.from, 'VIEWPORT_LOGICAL_RANGE_INVALID', 'Range start must be finite.');
  const to = requireFinite(range.to, 'VIEWPORT_LOGICAL_RANGE_INVALID', 'Range end must be finite.');
  if (to <= from) {
    failViewport('VIEWPORT_LOGICAL_RANGE_INVALID', 'Logical range must increase.');
  }
  return Object.freeze({ latestOffsetBars: to - latest, spanBars: to - from });
}

/** Project semantic intent without storing an adapter's logical range as product truth. */
export function projectViewportIntent(intent, { defaultSpanBars, latestLogicalIndex }) {
  const value = readViewportIntent(intent);
  const latest = requireFinite(
    latestLogicalIndex,
    'VIEWPORT_LATEST_INDEX_INVALID',
    'Latest logical index must be finite.',
  );
  const spanBars = value.spanBars ?? requirePositive(
    defaultSpanBars,
    'VIEWPORT_DEFAULT_SPAN_INVALID',
    'Default visible span must be positive.',
  );
  const to = latest + value.latestOffsetBars;
  return Object.freeze({
    from: to - spanBars,
    latestLogicalIndex: latest,
    latestOffsetBars: value.latestOffsetBars,
    origin: value.origin,
    revision: value.revision,
    scope: value.scope,
    spanBars,
    to,
  });
}
