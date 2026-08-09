/**
 * Owner: annotation-interaction-controller.
 * Purpose: expose removable two-anchor Drawing gestures and transient Inspector state over bounded ports.
 * Inputs: normalized market-anchor gestures, pure Geometry, transient Preview, and one Drawing command.
 * Outputs: one disposable controller plus immutable interaction snapshots.
 * Side effects: calls only injected Preview and generic-Drawing command ports; never DOM or Chart APIs.
 * Lifecycle: one-shot gestures are armed explicitly and every active gesture is cancelled on dispose.
 * Errors: AnnotationInteractionError rejects malformed ports, commands, or overlapping interaction.
 * Concurrency/cancellation: pointer moves coalesce in the Preview owner; pointer-up issues at most one command.
 */
export { AnnotationInteractionError } from './interaction-error.js';
export { createDrawingInspectorController } from './drawing-inspector-controller.js';
export { createRectangleInteractionController } from './rectangle-interaction-controller.js';
export { createSegmentInteractionController } from './segment-interaction-controller.js';
