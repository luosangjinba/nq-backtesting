/**
 * Owner: plugin-center-ui.
 * Purpose: render the Plugin Center control/workspace for trusted-build Core and inactive local-package surfaces inside host Settings.
 * Inputs: immutable profile/package snapshots plus explicit picker, preparation, commit, and recovery ports.
 * Outputs: accessible disposable DOM subtrees for Included, Installed, install review, and Developer Mode.
 * Side effects: mutates only its owned DOM, invokes injected commands/pickers, and never loads or controls package code.
 * Lifecycle: the control subscribes while mounted and releases its subscription and DOM on dispose.
 * Errors: invalid ports throw; command failures are rendered as stable host-owned copy.
 * Concurrency/cancellation: exact profile revisions reject stale events; the UI owns no asynchronous work queue.
 */
export { createCorePluginCenterControl } from './plugin-center-control.js';
export { createDeveloperModeControl } from './developer-mode-control.js';
export { createLocalPluginPackageBrowserAdapter } from './local-package-browser-adapter.js';
export { createLocalPluginInstalledControl } from './local-package-installed-control.js';
export { createPluginCenterWorkspaceControl } from './plugin-center-workspace-control.js';
