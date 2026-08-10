/**
 * Owner: annotation-evidence-resolver.
 * Purpose: expose the pure R13.10a accepted-snapshot evidence contract and resolver.
 * Inputs: exact immutable Session/Workspace/Pane/Replay snapshot, user selection, and bounded requirement values.
 * Outputs: branded frozen evidence values with exact Bar provenance and Artifact revisions.
 * Side effects: none; this optional module owns no cache, request queue, Replay cursor, UI, storage, or network port.
 * Lifecycle: static pure API with no start, stop, or disposal phase.
 * Errors: malformed, missing, stale, unbounded, or future evidence throws AnnotationEvidenceError with a stable code.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
export { AnnotationEvidenceError } from './evidence-error.js';
export { readAnnotationEvidenceBundle } from './evidence-bundle.js';
export {
  createAnnotationEvidenceRequirement,
  createAnnotationEvidenceSelection,
} from './evidence-request.js';
export { resolveAnnotationEvidence } from './evidence-resolver.js';
export { createAcceptedAnnotationEvidenceSnapshot } from './evidence-snapshot.js';
