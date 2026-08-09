import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import {
  advanceAnnotationHistory,
  annotationHistorySnapshot,
  createEmptyAnnotationHistory,
  restoreAnnotationHistoryState,
  traverseAnnotationHistory,
} from './annotation-history.js';
import {
  createInitialAnnotationDocument,
  drawingFromDocument,
  readAnnotationDocument,
  rebaseAnnotationDocument,
  restoreAnnotationDocument,
} from './annotation-document.js';
import { failAnnotation } from './annotation-error.js';
import { readDrawingId } from './drawing-id.js';
import { readDrawingPresentation } from './drawing-presentation.js';
import {
  normalizeGeometryContract,
  readAcceptedGeometry,
  restoreAcceptedGeometry,
} from './geometry-port.js';
import {
  exportAnnotationDocument,
  parseAnnotationImport,
  prepareAnnotationRepository,
  requireAnnotationRepository,
} from './repository-port.js';

function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failAnnotation('ANNOTATION_COMMAND_FIELDS_INVALID', `${label} fields must be exact.`);
  }
}

function requireRevision(value, code, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    failAnnotation(code, `${label} revision is invalid.`);
  }
  return value;
}

function nextDocumentRevision(document) {
  const revision = readAnnotationDocument(document).revision;
  if (revision === Number.MAX_SAFE_INTEGER) {
    failAnnotation('ANNOTATION_DOCUMENT_REVISION_EXHAUSTED', 'Document revision cannot advance.');
  }
  return revision + 1;
}

function repositoryHistory(history) {
  const entries = (values) => Object.freeze(values.map((entry) => Object.freeze({
    document: readAnnotationDocument(entry.document),
    opaqueState: entry.opaqueState,
  })));
  return Object.freeze({ redo: entries(history.redo), undo: entries(history.undo) });
}

class AnnotationRuntimeState {
  #activeOperation = null;
  #document;
  #geometry;
  #history;
  #opaqueState = null;
  #port;
  #scope;
  #status = 'ready';

  constructor({ geometryContract, initialState = null, repository, sessionId }) {
    this.#scope = requireSessionId(sessionId);
    this.#geometry = normalizeGeometryContract(geometryContract);
    this.#port = requireAnnotationRepository(repository);
    if (initialState === null) {
      this.#document = createInitialAnnotationDocument(this.#scope);
      this.#history = createEmptyAnnotationHistory();
      return;
    }
    const restored = restoreAnnotationHistoryState(
      initialState,
      (document) => this.#restoreDocument(document),
    );
    this.#document = restored.document;
    this.#history = restored.history;
    this.#opaqueState = restored.opaqueState;
  }

  #currentState() {
    return Object.freeze({
      document: this.#document,
      history: this.#history,
      opaqueState: this.#opaqueState,
    });
  }

  #requireReadable() {
    if (this.#status === 'disposing' || this.#status === 'disposed') {
      failAnnotation('ANNOTATION_RUNTIME_DISPOSED', 'Annotation Runtime is disposed.');
    }
  }

  #requireWritable() {
    this.#requireReadable();
    if (this.#status === 'poisoned') {
      failAnnotation('ANNOTATION_RUNTIME_POISONED', 'Annotation Runtime requires reconstruction.');
    }
    if (this.#activeOperation !== null) {
      failAnnotation('ANNOTATION_TRANSACTION_ACTIVE', 'One Annotation transaction is already active.');
    }
  }

  #requireCommandSession(candidate) {
    requireSessionId(candidate);
    if (!sessionIdsEqual(candidate, this.#scope)) {
      failAnnotation('ANNOTATION_SESSION_MISMATCH', 'Annotation command belongs to another Session.');
    }
  }

  #requireExpectedDocumentRevision(candidate) {
    const expected = requireRevision(
      candidate,
      'ANNOTATION_DOCUMENT_REVISION_INVALID',
      'Expected document',
    );
    if (expected !== readAnnotationDocument(this.#document).revision) {
      failAnnotation('ANNOTATION_DOCUMENT_REVISION_STALE', 'Annotation document revision is stale.');
    }
  }

  #restoreDocument(document) {
    return restoreAnnotationDocument(this.#scope, document, {
      restoreGeometry: (geometry) => restoreAcceptedGeometry(this.#geometry, geometry).snapshot,
    });
  }

  async #settle(candidate) {
    const baseDocument = readAnnotationDocument(this.#document);
    const candidateDocument = readAnnotationDocument(candidate.document);
    const preparation = await prepareAnnotationRepository(this.#port, Object.freeze({
      baseDocument,
      baseHistory: repositoryHistory(this.#history),
      candidateDocument,
      candidateHistory: repositoryHistory(candidate.history),
      candidateOpaqueState: candidate.opaqueState,
      expectedRevision: baseDocument.revision,
      sessionId: this.#scope,
    }));
    try {
      await preparation.apply();
      const finalized = await preparation.finalize();
      if (finalized !== undefined && (!finalized || typeof finalized !== 'object'
        || Array.isArray(finalized)
        || Object.keys(finalized).sort().join(',') !== 'opaqueState')) {
        failAnnotation(
          'ANNOTATION_REPOSITORY_FINALIZE_RESULT_INVALID',
          'Annotation Repository finalize result is invalid.',
        );
      }
      this.#document = candidate.document;
      this.#history = candidate.history;
      this.#opaqueState = finalized?.opaqueState ?? candidate.opaqueState;
      return candidateDocument;
    } catch (cause) {
      await this.#rollback(preparation, cause);
    }
  }

  async #rollback(preparation, cause) {
    try {
      await preparation.rollback();
    } catch (rollbackCause) {
      this.#status = 'poisoned';
      failAnnotation(
        'ANNOTATION_TRANSACTION_ROLLBACK_FAILED',
        'Annotation transaction failed and exact rollback was not proven.',
        { cause: new AggregateError([cause, rollbackCause]) },
      );
    }
    failAnnotation(
      'ANNOTATION_TRANSACTION_FAILED',
      'Annotation transaction failed and restored its prior state.',
      { cause },
    );
  }

  #startOperation(execute) {
    try { this.#requireWritable(); } catch (error) { return Promise.reject(error); }
    const operation = Promise.resolve().then(execute);
    this.#activeOperation = operation;
    return operation.finally(() => {
      if (this.#activeOperation === operation) this.#activeOperation = null;
    });
  }

  documentSnapshot() {
    this.#requireReadable();
    return readAnnotationDocument(this.#document);
  }

  documentValue() { return this.#document; }

  drawingSnapshot(drawingId) {
    this.#requireReadable();
    return drawingFromDocument(this.#document, readDrawingId(drawingId));
  }

  drawingSnapshots() {
    this.#requireReadable();
    return readAnnotationDocument(this.#document).drawings;
  }

  async exportDocument() {
    this.#requireReadable();
    return exportAnnotationDocument(this.#port, Object.freeze({
      document: readAnnotationDocument(this.#document),
      opaqueState: this.#opaqueState,
      sessionId: this.#scope,
    }));
  }

  health() {
    const history = this.#history === null ? null : annotationHistorySnapshot(this.#history);
    return Object.freeze({
      activeTransaction: this.#activeOperation !== null,
      canRedo: history?.canRedo ?? false,
      canUndo: history?.canUndo ?? false,
      documentRevision: this.#document === null ? null : readAnnotationDocument(this.#document).revision,
      geometryAvailable: this.#geometry !== null,
      semanticPackageCount: 0,
      status: this.#status,
    });
  }

  historySnapshot() {
    this.#requireReadable();
    return annotationHistorySnapshot(this.#history);
  }

  importDocument(input, fields) {
    return this.#startOperation(async () => {
      this.validateBaseCommand(input, fields, 'Import Annotation document command');
      const imported = await parseAnnotationImport(this.#port, Object.freeze({
        payload: input.payload,
        sessionId: this.#scope,
      }));
      const restored = this.#restoreDocument(imported.document);
      const nextRevision = nextDocumentRevision(this.#document);
      const document = rebaseAnnotationDocument(restored, this.#scope, nextRevision);
      return this.#settle(advanceAnnotationHistory(
        this.#currentState(),
        document,
        imported.opaqueState,
      ));
    });
  }

  readGeometry(candidate) { return readAcceptedGeometry(this.#geometry, candidate); }

  readPresentation(candidate) { return readDrawingPresentation(candidate); }

  requireExistingDrawing(drawingId, expectedRevision) {
    const token = readDrawingId(drawingId);
    const drawing = drawingFromDocument(this.#document, token);
    if (drawing === null) failAnnotation('DRAWING_NOT_FOUND', `Drawing ${token} does not exist.`);
    const expected = requireRevision(expectedRevision, 'DRAWING_REVISION_INVALID', 'Expected Drawing', 1);
    if (drawing.revision !== expected) {
      failAnnotation('DRAWING_REVISION_STALE', `Drawing ${token} revision is stale.`);
    }
    return drawing;
  }

  runHistory(input, fields, direction) {
    return this.#startOperation(() => {
      this.validateBaseCommand(input, fields, `${direction} Annotation command`);
      const nextRevision = nextDocumentRevision(this.#document);
      const candidate = traverseAnnotationHistory(
        this.#currentState(),
        direction,
        (document) => rebaseAnnotationDocument(document, this.#scope, nextRevision),
      );
      return this.#settle(candidate);
    });
  }

  runMutation(buildCandidate) {
    return this.#startOperation(() => this.#settle(advanceAnnotationHistory(
      this.#currentState(),
      buildCandidate(),
    )));
  }

  sessionId() { return this.#scope; }

  validateBaseCommand(input, fields, label) {
    exactRecord(input, fields, label);
    this.#requireCommandSession(input.sessionId);
    this.#requireExpectedDocumentRevision(input.expectedDocumentRevision);
  }

  async dispose() {
    if (this.#status === 'disposed') return;
    this.#status = 'disposing';
    if (this.#activeOperation !== null) await this.#activeOperation.catch(() => {});
    this.#activeOperation = null;
    this.#document = null;
    this.#geometry = null;
    this.#history = null;
    this.#opaqueState = null;
    this.#port = null;
    this.#status = 'disposed';
  }
}

/** Create one isolated internal state owner for the public Runtime facade. */
export function createAnnotationRuntimeState(input) {
  return new AnnotationRuntimeState(input);
}
