import { serializeSessionId } from '../session-identity/public.js';
import { failAnnotation } from './annotation-error.js';
import { createDrawingId, readDrawingId } from './drawing-id.js';
import { createDrawingPresentation, readDrawingPresentation } from './drawing-presentation.js';
import { createDrawingProvenance, readDrawingProvenance } from './drawing-provenance.js';

const DOCUMENT_FIELDS = Object.freeze(['artifacts', 'drawings', 'revision', 'schemaVersion', 'sessionId']);
const DRAWING_FIELDS = Object.freeze([
  'drawingId', 'geometry', 'presentation', 'provenance', 'revision', 'scope', 'status',
]);

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

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failAnnotation(code, `${label} fields are invalid.`);
  }
}

function requireStoredRevision(value, minimum, label) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    failAnnotation('ANNOTATION_STORED_REVISION_INVALID', `${label} revision is invalid.`);
  }
  return value;
}

function freezeDrawing(value) {
  return Object.freeze({
    drawingId: value.drawingId,
    geometry: value.geometry,
    presentation: value.presentation,
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

/** Restore one canonical portable document after adapter migration/opaque stripping. */
export function restoreAnnotationDocument(sessionId, candidate, { restoreGeometry } = {}) {
  exactRecord(candidate, DOCUMENT_FIELDS, 'ANNOTATION_STORED_DOCUMENT_INVALID', 'Stored document');
  const token = serializeSessionId(sessionId).value;
  if (candidate.schemaVersion !== 1 || candidate.sessionId !== token
    || !Array.isArray(candidate.artifacts) || candidate.artifacts.length !== 0
    || !Array.isArray(candidate.drawings) || typeof restoreGeometry !== 'function') {
    failAnnotation('ANNOTATION_STORED_DOCUMENT_INVALID', 'Stored document contract is unsupported.');
  }
  const drawings = candidate.drawings.map((drawing) => {
    exactRecord(drawing, DRAWING_FIELDS, 'ANNOTATION_STORED_DRAWING_INVALID', 'Stored Drawing');
    exactRecord(drawing.scope, ['kind', 'sessionId'], 'ANNOTATION_STORED_SCOPE_INVALID', 'Stored scope');
    if (drawing.scope.kind !== 'session' || drawing.scope.sessionId !== token
      || !new Set(['active', 'archived']).has(drawing.status)) {
      failAnnotation('ANNOTATION_STORED_DRAWING_INVALID', 'Stored Drawing scope or status is invalid.');
    }
    let geometry;
    try { geometry = restoreGeometry(drawing.geometry); } catch (cause) {
      failAnnotation('ANNOTATION_STORED_GEOMETRY_INVALID', 'Stored Drawing Geometry is invalid.', { cause });
    }
    let presentation = null;
    if (drawing.presentation !== null) {
      presentation = readDrawingPresentation(createDrawingPresentation(drawing.presentation));
    }
    const provenance = readDrawingProvenance(createDrawingProvenance(drawing.provenance));
    return freezeDrawing({
      drawingId: readDrawingId(createDrawingId(drawing.drawingId)),
      geometry,
      presentation,
      provenance,
      revision: requireStoredRevision(drawing.revision, 1, 'Stored Drawing'),
      sessionId: token,
      status: drawing.status,
    });
  });
  if (new Set(drawings.map(({ drawingId }) => drawingId)).size !== drawings.length) {
    failAnnotation('ANNOTATION_STORED_DRAWING_DUPLICATE', 'Stored Drawing ids must be unique.');
  }
  return documentValue(
    sessionId,
    requireStoredRevision(candidate.revision, 0, 'Stored document'),
    drawings,
  );
}

/** Copy historical content under one newly allocated current document revision. */
export function rebaseAnnotationDocument(document, sessionId, revision) {
  const current = readAnnotationDocument(document);
  return documentValue(
    sessionId,
    requireStoredRevision(revision, 0, 'Rebased document'),
    current.drawings,
  );
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
export function addDrawing(document, {
  drawingId, geometry, presentation = null, provenance, sessionId,
}) {
  const current = readAnnotationDocument(document);
  if (current.drawings.some((drawing) => drawing.drawingId === drawingId)) {
    failAnnotation('DRAWING_ID_DUPLICATE', `Drawing ${drawingId} already exists.`);
  }
  const drawing = freezeDrawing({
    drawingId,
    geometry,
    presentation,
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
