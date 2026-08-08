import { addDrawing, replaceDrawing } from './annotation-document.js';
import { failAnnotation } from './annotation-error.js';
import { readDrawingId } from './drawing-id.js';
import { readDrawingProvenance } from './drawing-provenance.js';

const CREATE_FIELDS = Object.freeze([
  'drawingId', 'expectedDocumentRevision', 'geometry', 'provenance', 'sessionId',
]);
const REPLACE_FIELDS = Object.freeze([
  'drawingId', 'expectedDocumentRevision', 'expectedDrawingRevision', 'geometry', 'sessionId',
]);
const STATUS_FIELDS = Object.freeze([
  'drawingId', 'expectedDocumentRevision', 'expectedDrawingRevision', 'sessionId',
]);

/** Build and transact one generic Drawing creation command. */
export function createDrawing(state, input) {
  return state.runMutation(() => {
    state.validateBaseCommand(input, CREATE_FIELDS, 'Create Drawing command');
    return addDrawing(state.documentValue(), {
      drawingId: readDrawingId(input.drawingId),
      geometry: state.readGeometry(input.geometry),
      provenance: readDrawingProvenance(input.provenance),
      sessionId: state.sessionId(),
    });
  });
}

/** Build and transact one exact-revision Geometry replacement command. */
export function replaceDrawingGeometry(state, input) {
  return state.runMutation(() => {
    state.validateBaseCommand(input, REPLACE_FIELDS, 'Replace Drawing Geometry command');
    const drawing = state.requireExistingDrawing(input.drawingId, input.expectedDrawingRevision);
    if (drawing.status !== 'active') {
      failAnnotation('DRAWING_ARCHIVED', 'Archived Drawing Geometry cannot be replaced.');
    }
    return replaceDrawing(state.documentValue(), {
      drawingId: drawing.drawingId,
      replacement: { geometry: state.readGeometry(input.geometry) },
      sessionId: state.sessionId(),
    });
  });
}

function transitionDrawing(state, input, { expectedStatus, nextStatus, rejectedCode, rejectedMessage }) {
  return state.runMutation(() => {
    state.validateBaseCommand(input, STATUS_FIELDS, `${nextStatus} Drawing command`);
    const drawing = state.requireExistingDrawing(input.drawingId, input.expectedDrawingRevision);
    if (drawing.status !== expectedStatus) failAnnotation(rejectedCode, rejectedMessage);
    return replaceDrawing(state.documentValue(), {
      drawingId: drawing.drawingId,
      replacement: { status: nextStatus },
      sessionId: state.sessionId(),
    });
  });
}

/** Archive one active Drawing without deleting accepted history. */
export function archiveDrawing(state, input) {
  return transitionDrawing(state, input, {
    expectedStatus: 'active',
    nextStatus: 'archived',
    rejectedCode: 'DRAWING_ALREADY_ARCHIVED',
    rejectedMessage: 'Drawing is already archived.',
  });
}

/** Restore one archived Drawing through exact revisions. */
export function restoreDrawing(state, input) {
  return transitionDrawing(state, input, {
    expectedStatus: 'archived',
    nextStatus: 'active',
    rejectedCode: 'DRAWING_ALREADY_ACTIVE',
    rejectedMessage: 'Drawing is already active.',
  });
}
