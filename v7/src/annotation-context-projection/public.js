/**
 * Owner: annotation-context-projection.
 * Purpose: derive and reversibly settle source-agnostic Annotation projections for exact Pane/Replay frames.
 * Inputs: immutable subjects/frames plus injected Geometry, policy, projection-factory, and Chart ports.
 * Outputs: per-Pane projection sets with exact mapping provenance and a disposable coordinator.
 * Side effects: only injected Chart Annotation projection ports may mutate visual primitives.
 * Lifecycle: registries/values are pure; each coordinator is isolated and explicitly disposable.
 * Errors: AnnotationContextProjectionError with stable validation/settlement codes.
 * Concurrency/cancellation: one reconciliation per coordinator; failures roll back before decision.
 */
export { AnnotationContextProjectionError } from './context-projection-error.js';
export {
  defineAnchorProjectionPolicy,
  readAnchorProjectionPolicy,
} from './anchor-policy-definition.js';
export { createAnchorProjectionPolicyRegistry } from './anchor-policy-registry.js';
export {
  ANCHOR_PROJECTION_POLICIES,
  createInitialAnchorProjectionPolicyRegistry,
} from './built-in-anchor-policies.js';
export {
  createAnnotationProjectionFrame,
  readAnnotationProjectionFrame,
} from './projection-frame.js';
export {
  createAnnotationProjectionSubject,
  readAnnotationProjectionSubject,
} from './projection-subject.js';
export { deriveAnnotationPaneProjectionSets } from './projection-assembly.js';
export { createMultiPaneAnnotationProjectionRuntime } from './multi-pane-projection-runtime.js';
