import {
  addDrawing,
  addSemanticArtifact,
  promoteDrawingToSemanticArtifact,
  replaceDrawing,
  replaceSemanticArtifact,
} from './annotation-document.js';
import { failAnnotation } from './annotation-error.js';
import { readDrawingId } from './drawing-id.js';
import { readDrawingProvenance } from './drawing-provenance.js';

const CREATE_FIELDS = Object.freeze([
  'drawingId', 'expectedDocumentRevision', 'geometry', 'provenance', 'sessionId',
]);
const CREATE_PRESENTED_FIELDS = Object.freeze([...CREATE_FIELDS, 'presentation']);
const REPLACE_FIELDS = Object.freeze([
  'drawingId', 'expectedDocumentRevision', 'expectedDrawingRevision', 'geometry', 'sessionId',
]);
const STATUS_FIELDS = Object.freeze([
  'drawingId', 'expectedDocumentRevision', 'expectedDrawingRevision', 'sessionId',
]);
const REVISE_FIELDS = Object.freeze([
  'drawingId', 'expectedDocumentRevision', 'expectedDrawingRevision', 'geometry',
  'presentation', 'sessionId',
]);
const HISTORY_FIELDS = Object.freeze(['expectedDocumentRevision', 'sessionId']);
const IMPORT_FIELDS = Object.freeze(['expectedDocumentRevision', 'payload', 'sessionId']);
const CREATE_ARTIFACT_FIELDS = Object.freeze(['draft', 'expectedDocumentRevision', 'sessionId']);
const PROMOTE_FIELDS = Object.freeze([
  'draft', 'drawingDisposition', 'drawingId', 'expectedDocumentRevision',
  'expectedDrawingRevision', 'sessionId',
]);
const ARTIFACT_STATUS_FIELDS = Object.freeze([
  'artifactId', 'expectedArtifactRevision', 'expectedDocumentRevision', 'sessionId',
]);

/** Build and transact one generic Drawing creation command. */
export function createDrawing(state, input) {
  return state.runMutation(() => {
    const fields = Object.hasOwn(input ?? {}, 'presentation')
      ? CREATE_PRESENTED_FIELDS : CREATE_FIELDS;
    state.validateBaseCommand(input, fields, 'Create Drawing command');
    return addDrawing(state.documentValue(), {
      drawingId: readDrawingId(input.drawingId),
      geometry: state.readGeometry(input.geometry),
      presentation: Object.hasOwn(input, 'presentation')
        ? state.readPresentation(input.presentation) : null,
      provenance: readDrawingProvenance(input.provenance),
      sessionId: state.sessionId(),
    });
  });
}

/** Atomically replace one active Drawing's Geometry and Presentation. */
export function reviseDrawing(state, input) {
  return state.runMutation(() => {
    state.validateBaseCommand(input, REVISE_FIELDS, 'Revise Drawing command');
    const drawing = state.requireExistingDrawing(input.drawingId, input.expectedDrawingRevision);
    if (drawing.status !== 'active') {
      failAnnotation('DRAWING_ARCHIVED', 'Archived Drawing cannot be revised.');
    }
    return replaceDrawing(state.documentValue(), {
      drawingId: drawing.drawingId,
      replacement: {
        geometry: state.readGeometry(input.geometry),
        presentation: state.readPresentation(input.presentation),
      },
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

/** Create one package-validated Artifact through the sole document writer. */
export function createSemanticArtifact(state, input) {
  return state.runMutation(() => {
    state.validateBaseCommand(input, CREATE_ARTIFACT_FIELDS, 'Create Semantic Artifact command');
    const draft = state.readSemanticDraft(input.draft);
    if (draft.sourceDrawing !== null) {
      failAnnotation(
        'SEMANTIC_ARTIFACT_PROMOTION_REQUIRED',
        'A Drawing-derived Artifact must use the atomic promotion command.',
      );
    }
    return addSemanticArtifact(state.documentValue(), {
      artifact: draft.artifact,
      sessionId: state.sessionId(),
    });
  });
}

/** Atomically promote one exact horizontal Drawing through an active package draft. */
export function promoteDrawing(state, input) {
  return state.runMutation(() => {
    state.validateBaseCommand(input, PROMOTE_FIELDS, 'Promote Drawing command');
    if (!['archive', 'retain'].includes(input.drawingDisposition)) {
      failAnnotation('SEMANTIC_PROMOTION_DISPOSITION_INVALID', 'Drawing disposition is invalid.');
    }
    const drawing = state.requireExistingDrawing(input.drawingId, input.expectedDrawingRevision);
    if (drawing.status !== 'active') {
      failAnnotation('DRAWING_ARCHIVED', 'Archived Drawing cannot be promoted.');
    }
    const draft = state.readSemanticDraft(input.draft);
    if (draft.sourceDrawing === null || draft.sourceDrawing.drawingId !== drawing.drawingId
      || draft.sourceDrawing.revision !== drawing.revision
      || draft.artifact.provenance.promotedFromDrawingId !== drawing.drawingId) {
      failAnnotation('SEMANTIC_PROMOTION_SOURCE_STALE', 'Artifact draft source Drawing is stale.');
    }
    return promoteDrawingToSemanticArtifact(state.documentValue(), {
      artifact: draft.artifact,
      drawingDisposition: input.drawingDisposition,
      drawingId: drawing.drawingId,
      sessionId: state.sessionId(),
    });
  });
}

function transitionArtifact(
  state,
  input,
  { expectedStatus, nextStatus, rejectedCode, rejectedMessage },
) {
  return state.runMutation(() => {
    state.validateBaseCommand(input, ARTIFACT_STATUS_FIELDS, `${nextStatus} Artifact command`);
    const artifact = state.requireExistingArtifact(
      input.artifactId,
      input.expectedArtifactRevision,
    );
    if (artifact.status !== expectedStatus) failAnnotation(rejectedCode, rejectedMessage);
    return replaceSemanticArtifact(state.documentValue(), {
      artifactId: artifact.artifactId,
      replacement: { status: nextStatus },
      sessionId: state.sessionId(),
    });
  });
}

/** Archive one active Semantic Artifact without deleting historical evidence. */
export function archiveSemanticArtifact(state, input) {
  return transitionArtifact(state, input, {
    expectedStatus: 'active',
    nextStatus: 'archived',
    rejectedCode: 'SEMANTIC_ARTIFACT_ALREADY_ARCHIVED',
    rejectedMessage: 'Semantic Artifact is already archived.',
  });
}

/** Restore one archived Semantic Artifact through exact revisions. */
export function restoreSemanticArtifact(state, input) {
  return transitionArtifact(state, input, {
    expectedStatus: 'archived',
    nextStatus: 'active',
    rejectedCode: 'SEMANTIC_ARTIFACT_ALREADY_ACTIVE',
    rejectedMessage: 'Semantic Artifact is already active.',
  });
}

/** Restore one exact prior accepted Annotation state as a new revision. */
export function undoAnnotation(state, input) {
  return state.runHistory(input, HISTORY_FIELDS, 'undo');
}

/** Reapply one exact undone Annotation state as a new revision. */
export function redoAnnotation(state, input) {
  return state.runHistory(input, HISTORY_FIELDS, 'redo');
}

/** Import one versioned document through the durable Repository parser. */
export function importAnnotationDocument(state, input) {
  return state.importDocument(input, IMPORT_FIELDS);
}
