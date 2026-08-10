import {
  archiveDrawing,
  archiveSemanticArtifact,
  createSemanticArtifact,
  createDrawing,
  importAnnotationDocument,
  redoAnnotation,
  promoteDrawing,
  replaceDrawingGeometry,
  reviseDrawing,
  restoreDrawing,
  restoreSemanticArtifact,
  undoAnnotation,
} from './command-handlers.js';
import { loadAnnotationRepository } from './repository-port.js';
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
export function createAnnotationRuntime({
  geometryContract = null,
  initialState = null,
  repository,
  semanticContract = null,
  sessionId,
} = {}) {
  const state = createAnnotationRuntimeState({
    geometryContract, initialState, repository, semanticContract, sessionId,
  });
  return Object.freeze({
    archiveDrawing: (input) => archiveDrawing(state, input),
    archiveSemanticArtifact: (input) => archiveSemanticArtifact(state, input),
    createDrawing: (input) => createDrawing(state, input),
    createSemanticArtifact: (input) => createSemanticArtifact(state, input),
    dispose: () => state.dispose(),
    exportDocument: () => state.exportDocument(),
    getDocument: () => state.documentSnapshot(),
    getDrawing: (drawingId) => state.drawingSnapshot(drawingId),
    getSemanticArtifact: (artifactId) => state.artifactSnapshot(artifactId),
    health: () => state.health(),
    history: () => state.historySnapshot(),
    importDocument: (input) => importAnnotationDocument(state, input),
    listDrawings: () => state.drawingSnapshots(),
    listSemanticArtifacts: () => state.artifactSnapshots(),
    promoteDrawing: (input) => promoteDrawing(state, input),
    redo: (input) => redoAnnotation(state, input),
    replaceDrawingGeometry: (input) => replaceDrawingGeometry(state, input),
    reviseDrawing: (input) => reviseDrawing(state, input),
    restoreDrawing: (input) => restoreDrawing(state, input),
    restoreSemanticArtifact: (input) => restoreSemanticArtifact(state, input),
    undo: (input) => undoAnnotation(state, input),
  });
}

/** Load one Session-keyed durable state and construct its isolated Runtime. */
export async function createRestoredAnnotationRuntime({
  geometryContract = null,
  repository,
  semanticContract = null,
  sessionId,
} = {}) {
  const initialState = await loadAnnotationRepository(repository, Object.freeze({ sessionId }));
  return createAnnotationRuntime({
    geometryContract, initialState, repository, semanticContract, sessionId,
  });
}
