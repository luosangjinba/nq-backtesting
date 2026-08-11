/**
 * Owner: annotation-interaction-controller.
 * Purpose: expose removable Drawing gestures plus generic Drawing/Semantic Inspector draft lifecycles.
 * Inputs: normalized gestures, validated host schemas, pure contracts, transient Preview, and exact commands.
 * Outputs: disposable controllers with immutable interaction, selection, field, and dirty-state snapshots.
 * Side effects: calls only injected Preview and command ports; never receives DOM, Chart, Replay, Bar, or storage APIs.
 * Lifecycle: gestures arm explicitly; cancel/dispose clears every local draft, selection, and Preview identity.
 * Errors: AnnotationInteractionError rejects malformed ports, stale drafts, unsupported fields, and overlapping work.
 * Concurrency/cancellation: each controller serializes settlement; Preview owner coalescing remains separately authoritative.
 */
export { AnnotationInteractionError } from './interaction-error.js';
export { createDrawingInspectorController } from './drawing-inspector-controller.js';
export { createRectangleInteractionController } from './rectangle-interaction-controller.js';
export { createSemanticArtifactInspectorController } from './semantic-inspector-controller.js';
export { createSegmentInteractionController } from './segment-interaction-controller.js';
