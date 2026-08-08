import { serializeSessionId } from '../session-identity/public.js';
import { failAnnotation } from './annotation-error.js';

class AnnotationDocumentValue {
  #snapshot;

  constructor(snapshot) {
    this.#snapshot = snapshot;
    Object.freeze(this);
  }

  read() { return this.#snapshot; }
}

function nextRevision(revision, code, label) {
  if (!Number.isSafeInteger(revision) || revision < 0 || revision === Number.MAX_SAFE_INTEGER) {
    failAnnotation(code, `${label} revision cannot advance.`);
  }
  return revision + 1;
}

function freezeDrawing(value) {
  return Object.freeze({
    drawingId: value.drawingId,
    geometry: value.geometry,
    presentation: null,
    provenance: value.provenance,
    revision: value.revision,
    scope: Object.freeze({ kind: 'session', sessionId: value.sessionId }),
    status: value.status,
  });
}

function documentValue(sessionId, revision, drawings) {
  const token = serializeSessionId(sessionId).value;
  const ordered = Object.freeze([...drawings].sort((left, right) => (
    left.drawingId.localeCompare(right.drawingId)
  )));
  return new AnnotationDocumentValue(Object.freeze({
    artifacts: Object.freeze([]),
    drawings: ordered,
    revision,
    schemaVersion: 1,
    sessionId: token,
  }));
}

/** Create one empty Session-scoped Annotation Document. */
export function createInitialAnnotationDocument(sessionId) {
  return documentValue(sessionId, 0, []);
}

/** Expose one accepted deeply immutable Annotation Document snapshot. */
export function readAnnotationDocument(candidate) {
  if (!(candidate instanceof AnnotationDocumentValue)) {
    failAnnotation('ANNOTATION_DOCUMENT_REQUIRED', 'A branded Annotation Document is required.');
  }
  return candidate.read();
}

/** Return one Drawing by opaque token from a branded document. */
export function drawingFromDocument(document, drawingId) {
  return readAnnotationDocument(document).drawings.find((drawing) => (
    drawing.drawingId === drawingId
  )) ?? null;
}

/** Create one generic Drawing and advance the document exactly once. */
export function addDrawing(document, { drawingId, geometry, provenance, sessionId }) {
  const current = readAnnotationDocument(document);
  if (current.drawings.some((drawing) => drawing.drawingId === drawingId)) {
    failAnnotation('DRAWING_ID_DUPLICATE', `Drawing ${drawingId} already exists.`);
  }
  const drawing = freezeDrawing({
    drawingId,
    geometry,
    provenance,
    revision: 1,
    sessionId: current.sessionId,
    status: 'active',
  });
  return documentValue(
    sessionId,
    nextRevision(current.revision, 'ANNOTATION_DOCUMENT_REVISION_EXHAUSTED', 'Document'),
    [...current.drawings, drawing],
  );
}

/** Replace one exact Drawing while advancing entity and document revisions once. */
export function replaceDrawing(document, { drawingId, replacement, sessionId }) {
  const current = readAnnotationDocument(document);
  const existing = drawingFromDocument(document, drawingId);
  if (existing === null) failAnnotation('DRAWING_NOT_FOUND', `Drawing ${drawingId} does not exist.`);
  const drawing = freezeDrawing({
    ...existing,
    ...replacement,
    revision: nextRevision(existing.revision, 'DRAWING_REVISION_EXHAUSTED', 'Drawing'),
    sessionId: existing.scope.sessionId,
  });
  return documentValue(
    sessionId,
    nextRevision(current.revision, 'ANNOTATION_DOCUMENT_REVISION_EXHAUSTED', 'Document'),
    current.drawings.map((candidate) => (candidate.drawingId === drawingId ? drawing : candidate)),
  );
}
