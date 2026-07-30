/** Public facade for provider-neutral pure pane projection. */
export { projectPaneReplayAdvance, projectPaneSnapshot } from './pane-projection.js';
export { projectPaneHistoryExtension } from './pane-history-extension.js';
export { createProjectedBar } from './projected-bar.js';
export { ProjectionDomainError } from './projection-error.js';
export {
  extendPaneProjectedHistory,
  preservePaneProjectedHistory,
  projectedHistoryOldestEpochMs,
} from './projected-history-composition.js';
