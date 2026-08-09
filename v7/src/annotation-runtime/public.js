/**
 * Owner: annotation-runtime.
 * Purpose: expose the complete R13.3 headless generic-Drawing document contract.
 * Inputs: branded Session/Drawing/provenance values, optional Geometry port, and fake Repository port.
 * Outputs: one disposable Runtime with exact-revision commands and immutable queries.
 * Side effects: only injected Repository preparations; no UI, Chart, Replay, Bars, or durable adapter.
 * Lifecycle: each Runtime is isolated and disposed explicitly.
 * Errors: AnnotationRuntimeError and branded identity errors.
 * Concurrency/cancellation: one asynchronous mutation at a time; no implicit queue or cancellation.
 */
export { AnnotationRuntimeError } from './annotation-error.js';
export { createAnnotationRuntime } from './annotation-runtime.js';
export { createDrawingId, readDrawingId } from './drawing-id.js';
export { createDrawingProvenance, readDrawingProvenance } from './drawing-provenance.js';
export {
  createDefaultDrawingPresentation,
  createDrawingPresentation,
  readDrawingPresentation,
} from './drawing-presentation.js';
