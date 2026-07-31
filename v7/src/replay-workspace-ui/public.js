/**
 * Owner: replay-workspace-ui.
 * Purpose: expose the complete supported public contract for replay workspace ui.
 * Inputs: validated view models, DOM hosts, and explicitly supplied callback ports.
 * Outputs: a UI surface handle and its owned DOM root.
 * Side effects: mutates only its owned DOM subtree and invokes supplied callbacks.
 * Lifecycle: mounted listeners and DOM resources remain owned until dispose or unmount.
 * Errors: invalid hosts or view models throw; callback failures remain owned by the caller boundary.
 * Concurrency/cancellation: UI callbacks delegate asynchronous cancellation and stale-result checks to runtime owners.
 */
/** Public facade for the real Session-scoped single/multi-Pane replay workspace. */
export { createReplayWorkspaceSurface } from './replay-workspace-surface.js';
export { REPLAY_WORKSPACE_STATES } from './workspace-view.js';
