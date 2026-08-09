import {
  archiveDrawing,
  createDrawing,
  replaceDrawingGeometry,
  reviseDrawing,
  restoreDrawing,
} from './command-handlers.js';
import { createAnnotationRuntimeState } from './runtime-state.js';

/**
 * Owner: Annotation Runtime.
 * Purpose: own one Session's accepted generic-Drawing document through exact reversible mutations.
 * Inputs: branded Session, optional Geometry public contract, and injected fake Repository port.
 * Outputs: frozen asynchronous commands, synchronous immutable queries, health, and disposal.
 * Side effects: writes only through repository.prepare() lifecycle; no Chart, storage, or event access.
 * Lifecycle: dispose blocks new work and waits for one already-started transaction to settle.
 * Errors: AnnotationRuntimeError plus branded Session identity failures.
 * Concurrency/cancellation: exactly one mutation may be active; a concurrent command is rejected.
 */
export function createAnnotationRuntime({ geometryContract = null, repository, sessionId } = {}) {
  const state = createAnnotationRuntimeState({ geometryContract, repository, sessionId });
  return Object.freeze({
    archiveDrawing: (input) => archiveDrawing(state, input),
    createDrawing: (input) => createDrawing(state, input),
    dispose: () => state.dispose(),
    getDocument: () => state.documentSnapshot(),
    getDrawing: (drawingId) => state.drawingSnapshot(drawingId),
    health: () => state.health(),
    listDrawings: () => state.drawingSnapshots(),
    replaceDrawingGeometry: (input) => replaceDrawingGeometry(state, input),
    reviseDrawing: (input) => reviseDrawing(state, input),
    restoreDrawing: (input) => restoreDrawing(state, input),
  });
}
