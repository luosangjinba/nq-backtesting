/**
 * Owner: validation-outcome-window-adapter.
 * Purpose: expose bounded no-future Validation Outcome observation through
 * existing Replay, Bar Data, Session Hours, and Workspace owners.
 * Inputs: owner read/request ports and one immutable Outcome window request.
 * Outputs: a deterministic target/invalidation/ambiguous/incomplete observation.
 * Side effects: requests coverage only through the injected Bar Data owner.
 * Lifecycle: stateless factory and per-request observation calls.
 * Errors: rejects future cutoffs, mismatched Pane identity, incomplete accepted
 * windows, cancellation, invalid paths, and resource ceilings.
 * Concurrency/cancellation: each Outcome request accepts an AbortSignal and
 * observes owner snapshots only after accepted Bar Data acquisition.
 */
export { createValidationOutcomeWindowAdapter } from './outcome-window-adapter.js';
