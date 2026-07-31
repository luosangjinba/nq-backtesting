/**
 * Owner: replay-navigation-runtime.
 * Purpose: expose the complete supported public contract for replay navigation preference store.
 * Inputs: validated versioned values and an explicitly supplied storage boundary.
 * Outputs: durable records, immutable snapshots, or persistence owner handles.
 * Side effects: reads or writes only the configured storage namespace.
 * Lifecycle: persistent owners retain no caller lifecycle beyond their documented handle and dispose operation.
 * Errors: invalid schemas and storage failures throw or reject with stable persistence errors.
 * Concurrency/cancellation: writes are serialized by the owner; cancellation applies only where an async API exposes it.
 */
export {
  createReplayNavigationPreferenceStore,
  ReplayNavigationPreferenceStoreError,
} from './preference-store.js';
