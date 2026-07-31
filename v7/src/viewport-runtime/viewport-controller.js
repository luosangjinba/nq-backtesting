import {
  moveViewportIntentCursor,
  promoteViewportIntentToManual,
  readViewportIntent,
  resetViewportIntentToDefault,
} from './viewport-intent.js';
import { measureManualViewportWall, projectViewportIntent } from './logical-projection.js';
import { failViewport } from './viewport-error.js';

/**
 * Own the current pane-local horizontal intent while delegating all math to the
 * pure R4.4 contract. Chart/data owners receive projections, never write intent.
 */
export function createViewportController({ defaultLatestOffsetBars = 12, defaultSpanBars, initialIntent }) {
  readViewportIntent(initialIntent);
  if (!Number.isFinite(defaultSpanBars) || defaultSpanBars <= 0) {
    failViewport('VIEWPORT_DEFAULT_SPAN_INVALID', 'Default visible span must be positive.');
  }
  if (!Number.isFinite(defaultLatestOffsetBars) || defaultLatestOffsetBars < 0) {
    failViewport('VIEWPORT_DEFAULT_OFFSET_INVALID', 'Default latest-bar offset must be non-negative.');
  }
  let intent = initialIntent;
  let latestOffsetBarsDefault = defaultLatestOffsetBars;

  return Object.freeze({
    captureManual({ latestLogicalIndex, range }) {
      const measurement = measureManualViewportWall({ latestLogicalIndex, range });
      intent = promoteViewportIntentToManual(intent, measurement);
      return intent;
    },
    moveCursor(cursorEpochMs) {
      intent = moveViewportIntentCursor(intent, cursorEpochMs);
      return intent;
    },
    project(latestLogicalIndex) {
      return projectViewportIntent(intent, { defaultSpanBars, latestLogicalIndex });
    },
    reset(latestOffsetBars = latestOffsetBarsDefault) {
      intent = resetViewportIntentToDefault(intent, { latestOffsetBars });
      return intent;
    },
    replace(candidate) {
      readViewportIntent(candidate);
      intent = candidate;
      return intent;
    },
    setDefaultLatestOffsetBars(value) {
      if (!Number.isFinite(value) || value < 0) {
        failViewport('VIEWPORT_DEFAULT_OFFSET_INVALID', 'Default latest-bar offset must be non-negative.');
      }
      latestOffsetBarsDefault = value;
      return latestOffsetBarsDefault;
    },
    snapshot: () => intent,
  });
}
