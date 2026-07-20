/** Public facade for pane-local, data-independent viewport intent semantics. */
export {
  createInitialViewportIntent,
  moveViewportIntentCursor,
  promoteViewportIntentToManual,
  readViewportIntent,
  resetViewportIntentToDefault,
} from './viewport-intent.js';
export { measureManualViewportWall, projectViewportIntent } from './logical-projection.js';
export { ViewportRuntimeError } from './viewport-error.js';
