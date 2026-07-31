/**
 * Owner: replay-workspace-composition.
 * Purpose: expose the complete supported public contract for replay workspace composition.
 * Inputs: validated configuration plus explicitly injected owner, persistence, and presentation ports.
 * Outputs: a bounded application or workspace command surface.
 * Side effects: constructs, wires, invokes, and disposes only the owners named by this composition boundary.
 * Lifecycle: the composed graph lives from factory creation until its exposed dispose operation.
 * Errors: construction and command failures propagate from the responsible owner with stable error codes.
 * Concurrency/cancellation: asynchronous commands preserve cancellation and current-identity checks across owner boundaries.
 */
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
} from './foundation-market.js';
export {
  collectTimeframeAlignmentPolicyIds,
  createTimeframeCapabilityRegistry,
} from './timeframe-capability-registry.js';
export { supportsFoundationWorkspace } from './foundation-workspace-support.js';
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
