/** Public facade for Session-scoped Replay Workspace construction and orchestration. */
export { createReplayWorkspaceComposition } from './workspace-composition.js';
export { createReplayAutoplayScheduler } from './autoplay-scheduler.js';
export {
  AUTOPLAY_SPEED_OPTIONS,
  DEFAULT_AUTOPLAY_SPEED,
  readAutoplaySpeed,
} from './autoplay-speed.js';
export {
  createFoundationCapabilities,
  FOUNDATION_IDS,
} from './foundation-capabilities.js';
export {
  createFoundationMarket,
  supportsFoundationWorkspace,
} from './foundation-market.js';
export { createFoundationSourceTraversal } from './foundation-source-traversal.js';
export { QUICK_GOTO_ACTIONS, QUICK_GOTO_SETTING_FIELDS } from './goto-quick-actions.js';
export {
  planReplacementHistoryFill,
  planSingleHistoryFill,
} from './history-fill-plan.js';
export { planSingleHistoryWindow } from './history-window-plan.js';
export { createLayoutSyncController } from './layout-sync-controller.js';
export {
  readWorkspacePaneIdentity,
  WORKSPACE_PANE_IDS,
} from './pane-identity.js';
export { createPaneTimeLocationController } from './pane-time-location-controller.js';
export { createRefreshFeedback } from './refresh-feedback.js';
export { resolveReplayTruncationTarget } from './replay-truncation.js';
export { createViewportSettingsConsumer } from './viewport-settings-consumer.js';
