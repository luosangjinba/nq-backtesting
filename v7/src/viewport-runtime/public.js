/** Public facade for pane-local, data-independent viewport intent semantics. */
export {
  createInitialViewportIntent,
  moveViewportIntentCursor,
  promoteViewportIntentToManual,
  readViewportIntent,
  resetViewportIntentToDefault,
} from './viewport-intent.js';
export { measureManualViewportWall, projectViewportIntent } from './logical-projection.js';
export { createViewportController } from './viewport-controller.js';
export { ViewportRuntimeError } from './viewport-error.js';
