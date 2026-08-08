import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import {
  createInitialAnnotationDocument,
  drawingFromDocument,
  readAnnotationDocument,
} from './annotation-document.js';
import { failAnnotation } from './annotation-error.js';
import { readDrawingId } from './drawing-id.js';
import { normalizeGeometryContract, readAcceptedGeometry } from './geometry-port.js';
import { prepareAnnotationRepository, requireAnnotationRepository } from './repository-port.js';

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

class AnnotationRuntimeState {
  #activeOperation = null;
  #document;
  #geometry;
  #port;
  #scope;
  #status = 'ready';

  constructor({ geometryContract, repository, sessionId }) {
    this.#scope = requireSessionId(sessionId);
    this.#geometry = normalizeGeometryContract(geometryContract);
    this.#port = requireAnnotationRepository(repository);
    this.#document = createInitialAnnotationDocument(this.#scope);
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

  async #settle(candidate) {
    const baseDocument = readAnnotationDocument(this.#document);
    const candidateDocument = readAnnotationDocument(candidate);
    const preparation = await prepareAnnotationRepository(this.#port, Object.freeze({
      baseDocument,
      candidateDocument,
      expectedRevision: baseDocument.revision,
      sessionId: this.#scope,
    }));
    try {
      await preparation.apply();
      await preparation.finalize();
      this.#document = candidate;
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

  health() {
    return Object.freeze({
      activeTransaction: this.#activeOperation !== null,
      documentRevision: this.#document === null ? null : readAnnotationDocument(this.#document).revision,
      geometryAvailable: this.#geometry !== null,
      semanticPackageCount: 0,
      status: this.#status,
    });
  }

  readGeometry(candidate) { return readAcceptedGeometry(this.#geometry, candidate); }

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

  runMutation(buildCandidate) {
    try {
      this.#requireWritable();
    } catch (error) {
      return Promise.reject(error);
    }
    const operation = (async () => this.#settle(buildCandidate()))();
    this.#activeOperation = operation;
    return operation.finally(() => {
      if (this.#activeOperation === operation) this.#activeOperation = null;
    });
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
    this.#port = null;
    this.#status = 'disposed';
  }
}

/** Create one isolated internal state owner for the public Runtime facade. */
export function createAnnotationRuntimeState(input) {
  return new AnnotationRuntimeState(input);
}
