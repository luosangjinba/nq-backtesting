/**
 * Owner: chart-runtime-adapter.
 * Purpose: expose accepted/transient Annotation projection transactions and bounded Chart interaction bridges.
 * Inputs: immutable vendor-neutral projections plus one explicitly injected primitive or Series port.
 * Outputs: branded projections/preparations/receipts, a disposable projection owner, or RenderPrimitive handle.
 * Side effects: only the injected primitive adapter may attach, update, detach, or destroy Annotation primitives.
 * Lifecycle: each projection port and RenderPrimitive is isolated and disposed explicitly by its Chart owner.
 * Errors: AnnotationChartProjectionError rejects malformed, stale, foreign, failed, or out-of-phase work.
 * Concurrency/cancellation: one asynchronous settlement at a time; vendor mutations are rollback-protected.
 */
export { AnnotationChartProjectionError } from './projection-error.js';
export {
  createAnnotationProjection,
  readAnnotationProjection,
} from './annotation-projection.js';
export { createChartAnnotationProjectionPort } from './chart-annotation-projection.js';
export { createChartAnnotationPreviewPort } from './chart-annotation-preview.js';
export {
  createAnnotationPreviewIdentity,
  readAnnotationPreviewIdentity,
} from './preview-identity.js';
export { createLightweightSeriesPrimitiveAdapter } from './lightweight-series-primitive-adapter.js';
export { createLightweightAnnotationInteractionPort } from './lightweight-annotation-interaction-port.js';
export {
  readAnnotationProjectionReceipt,
  readPreparedAnnotationProjection,
} from './prepared-projection.js';
export { createSegmentRenderPrimitive } from './segment-render-primitive.js';
export { createRectangleRenderPrimitive } from './rectangle-render-primitive.js';
