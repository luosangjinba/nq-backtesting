/**
 * Owner: calculated-series-ui.
 * Purpose: render package-neutral Add, legend, settings, visibility, placement, and removal controls.
 * Inputs: immutable calculated-series runtime snapshots/commands and DOM-only Pane attachment points.
 * Outputs: accessible Pane controls and dialogs with exact revisioned command dispatch.
 * Side effects: owns only DOM it creates; never writes Chart, Replay, Bars, ModuleHost, or persistence directly.
 * Lifecycle: one disposable UI instance unregisters every Pane attachment, subscription, and dialog.
 * Errors: bounded product copy; command failures do not expose stacks or private native identifiers.
 * Concurrency/cancellation: runtime busy state disables duplicate commands; all authority remains in the runtime.
 */
export { createCalculatedSeriesUi } from './calculated-series-ui.js';
