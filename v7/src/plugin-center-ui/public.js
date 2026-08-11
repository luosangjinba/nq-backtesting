/**
 * Owner: plugin-center-ui.
 * Purpose: render the trusted-build Core Plugin catalog inside host Settings.
 * Inputs: immutable package-neutral snapshots plus profile preparation/stage/restart command ports.
 * Outputs: one accessible disposable DOM subtree with search, details, settings, diagnostics, and pending actions.
 * Side effects: mutates only its owned DOM, invokes injected commands, and never loads or controls package code.
 * Lifecycle: the control subscribes while mounted and releases its subscription and DOM on dispose.
 * Errors: invalid ports throw; command failures are rendered as stable host-owned copy.
 * Concurrency/cancellation: exact profile revisions reject stale events; the UI owns no asynchronous work queue.
 */
export { createCorePluginCenterControl } from './plugin-center-control.js';
