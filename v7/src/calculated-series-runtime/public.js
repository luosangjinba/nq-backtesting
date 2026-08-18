/**
 * Owner: calculated-series-runtime.
 * Purpose: own one Session's exact calculated-series document, instance revisions, calculation orchestration, and commands.
 * Inputs: host-admitted trusted registrations, Profile snapshot, execution/persistence/Chart ports, exact Pane snapshots, and revisions.
 * Outputs: immutable product snapshots, complete P1c.2 candidates, and transactional add/settings/visibility/move/remove results.
 * Side effects: publishes only its own state and calls injected execution, sidecar, and Chart-owner ports.
 * Lifecycle: initialize once, bind one Chart port, serialize commands, cancel active work, and dispose explicitly.
 * Errors: stable runtime failures reject forged registrations, stale revisions, invalid settings, unavailable Pane, and unproven rollback.
 * Concurrency/cancellation: one command at a time; Workspace preparations and formula work carry exact AbortSignals and identities.
 */
export { CalculatedSeriesRuntimeError } from './runtime-error.js';
export { createTrustedCalculatedSeriesCatalog } from './registration-catalog.js';
export { createCalculatedSeriesRuntime } from './calculated-series-runtime.js';
