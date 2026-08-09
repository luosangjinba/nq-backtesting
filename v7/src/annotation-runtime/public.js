/**
 * Owner: annotation-runtime.
 * Purpose: expose the headless generic-Drawing document and durable-history contract.
 * Inputs: branded Session/Drawing/provenance values plus injected Geometry and Repository ports.
 * Outputs: isolated Runtime commands, immutable queries, reload restore, undo/redo, and import/export.
 * Side effects: only injected Repository preparations; no UI, Chart, Replay, Bars, or storage selection.
 * Lifecycle: each Runtime is isolated and disposed explicitly.
 * Errors: AnnotationRuntimeError and branded identity errors.
 * Concurrency/cancellation: one asynchronous mutation at a time; no implicit queue or cancellation.
 */
export { AnnotationRuntimeError } from './annotation-error.js';
export {
  createAnnotationRuntime,
  createRestoredAnnotationRuntime,
} from './annotation-runtime.js';
export { createDrawingId, readDrawingId } from './drawing-id.js';
export { createDrawingProvenance, readDrawingProvenance } from './drawing-provenance.js';
export {
  createDefaultDrawingPresentation,
  createDrawingPresentation,
  readDrawingPresentation,
} from './drawing-presentation.js';
