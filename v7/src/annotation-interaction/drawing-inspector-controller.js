import { AnnotationInteractionError, failInteraction } from './interaction-error.js';
import { requireFactory, requireGeometryContract, requirePreviewPort } from './interaction-ports.js';
import {
  controlsForDrawing,
  geometryForControls,
  PATCH_FIELDS,
  presentationForControls,
  requireDrawingPort,
  requireDrawingRecord,
  requireExactRecord,
  requireOpaqueId,
  requirePresentationContract,
  requireSupportedField,
  SELECT_FIELDS,
} from './drawing-inspector-draft.js';

/** Own selected Drawing identity plus one disposable, exact-revision Inspector draft. */
export function createDrawingInspectorController({
  createPreviewIdentity,
  drawingPort,
  geometryContract,
  onError = () => {},
  onStateChange = () => {},
  presentationContract,
  previewPort,
  projectPreview,
} = {}) {
  const drawings = requireDrawingPort(drawingPort);
  const geometry = requireGeometryContract(geometryContract, 'createRectangleGeometry');
  if (typeof geometry.createSegmentGeometry !== 'function') {
    failInteraction('ANNOTATION_INTERACTION_GEOMETRY_PORT_INVALID', 'Geometry contract requires Segment creation.');
  }
  const presentations = requirePresentationContract(presentationContract);
  const previews = requirePreviewPort(previewPort);
  const identityFactory = requireFactory(
    createPreviewIdentity,
    'ANNOTATION_INTERACTION_PREVIEW_IDENTITY_FACTORY_INVALID',
    'Preview identity factory',
  );
  const projector = requireFactory(
    projectPreview,
    'ANNOTATION_INTERACTION_PROJECTOR_INVALID',
    'Inspector projector',
  );
  if (typeof onError !== 'function' || typeof onStateChange !== 'function') {
    failInteraction('ANNOTATION_INTERACTION_CALLBACK_INVALID', 'Inspector callbacks must be functions.');
  }

  let accepted = null;
  let busy = false;
  let disposed = false;
  let draftControls = null;
  let draftGeometry = null;
  let draftPresentation = null;
  let draftRevision = 0;
  let lastError = null;
  let previewIdentity = null;
  let previewRevision = 0;
  let selectedDrawingId = null;
  let selectedProjectionId = null;
  let status = 'idle';

  function snapshot() {
    return Object.freeze({
      controls: draftControls,
      dirty: draftRevision > 1,
      draftRevision,
      lastErrorCode: lastError?.code ?? null,
      selectedDrawingId,
      selectedProjectionId,
      status,
    });
  }

  function publish() {
    try { onStateChange(snapshot()); } catch { /* UI observers never own Inspector state. */ }
  }

  function fail(code, message, cause) {
    const error = new AnnotationInteractionError(code, message, { cause });
    lastError = error;
    try { onError(error); } catch { /* Stable Inspector failure remains authoritative. */ }
    return error;
  }

  function report(error) {
    if (lastError !== error) {
      lastError = error;
      try { onError(error); } catch { /* Stable Inspector failure remains authoritative. */ }
    }
    return error;
  }

  function requireOperable() {
    if (disposed) failInteraction('ANNOTATION_INSPECTOR_DISPOSED', 'Drawing Inspector is disposed.');
    if (busy) failInteraction('ANNOTATION_INSPECTOR_BUSY', 'Drawing Inspector is settling another operation.');
  }

  async function clearPreview() {
    if (previewIdentity !== null) await previews.clear(previewIdentity);
  }

  function reset() {
    accepted = null;
    draftControls = null;
    draftGeometry = null;
    draftPresentation = null;
    draftRevision = 0;
    previewIdentity = null;
    previewRevision = 0;
    selectedDrawingId = null;
    selectedProjectionId = null;
    if (!disposed) status = 'idle';
  }

  function geometryFromControls() {
    return geometryForControls(draftControls, accepted.drawing, geometry);
  }

  function presentationFromControls() {
    return presentationForControls(draftControls, draftPresentation, presentations);
  }

  async function replacePreview() {
    previewRevision += 1;
    await previews.replace(previewIdentity, [projector(Object.freeze({
      drawingId: selectedDrawingId,
      geometry: draftGeometry,
      presentation: draftPresentation,
      projectionId: selectedProjectionId,
      revision: previewRevision,
    }))]);
  }

  async function operation(work) {
    requireOperable();
    busy = true;
    try {
      return await work();
    } catch (cause) {
      if (cause instanceof AnnotationInteractionError) throw report(cause);
      throw fail('ANNOTATION_INSPECTOR_OPERATION_FAILED', 'Inspector operation was rejected.', cause);
    } finally {
      busy = false;
      publish();
    }
  }

  return Object.freeze({
    async cancel() {
      return operation(async () => {
        try { await clearPreview(); } catch (cause) {
          throw fail('ANNOTATION_INSPECTOR_CANCEL_FAILED', 'Inspector Preview could not clear.', cause);
        }
        reset();
        return snapshot();
      });
    },
    async dispose() {
      if (disposed) return snapshot();
      if (busy) failInteraction('ANNOTATION_INSPECTOR_BUSY', 'Drawing Inspector is settling another operation.');
      try { await clearPreview(); } catch { /* Preview owner remains separately authoritative. */ }
      disposed = true;
      reset();
      status = 'disposed';
      publish();
      return snapshot();
    },
    async save() {
      return operation(async () => {
        if (accepted === null || draftRevision < 1) {
          failInteraction('ANNOTATION_INSPECTOR_SELECTION_REQUIRED', 'Select one Drawing before saving.');
        }
        status = 'saving';
        publish();
        try {
          await drawings.reviseDrawing(Object.freeze({
            documentRevision: accepted.documentRevision,
            drawingId: selectedDrawingId,
            drawingRevision: accepted.drawing.revision,
            geometry: draftGeometry,
            presentation: draftPresentation,
          }));
          await clearPreview();
          reset();
          return snapshot();
        } catch (cause) {
          status = 'selected';
          throw fail('ANNOTATION_INSPECTOR_SAVE_FAILED', 'Inspector save failed.', cause);
        }
      });
    },
    async select(value) {
      return operation(async () => {
        await clearPreview();
        reset();
        if (value === null) return snapshot();
        requireExactRecord(value, SELECT_FIELDS, 'ANNOTATION_INSPECTOR_SELECTION_INVALID', 'Selection');
        selectedDrawingId = requireOpaqueId(
          value.drawingId,
          'ANNOTATION_INSPECTOR_SELECTION_INVALID',
          'Drawing id',
        );
        selectedProjectionId = requireOpaqueId(
          value.projectionId,
          'ANNOTATION_INSPECTOR_SELECTION_INVALID',
          'Projection id',
        );
        accepted = requireDrawingRecord(await drawings.readDrawing(Object.freeze({
          drawingId: selectedDrawingId,
        })));
        draftPresentation = accepted.drawing.presentation === null
          ? presentations.createDefaultDrawingPresentation()
          : presentations.createDrawingPresentation(accepted.drawing.presentation);
        draftControls = controlsForDrawing(
          accepted.drawing,
          presentations.readDrawingPresentation(draftPresentation),
        );
        draftGeometry = geometryFromControls();
        draftRevision = 1;
        previewIdentity = identityFactory(`selection.${selectedDrawingId}`);
        status = 'selected';
        await replacePreview();
        return snapshot();
      });
    },
    snapshot,
    async updateDraft(value) {
      return operation(async () => {
        if (accepted === null) {
          failInteraction('ANNOTATION_INSPECTOR_SELECTION_REQUIRED', 'Select one Drawing before editing.');
        }
        requireExactRecord(value, PATCH_FIELDS, 'ANNOTATION_INSPECTOR_PATCH_INVALID', 'Inspector patch');
        if (value.expectedDraftRevision !== draftRevision) {
          failInteraction('ANNOTATION_INSPECTOR_DRAFT_STALE', 'Inspector draft revision is stale.');
        }
        requireSupportedField(draftControls.geometryTypeId, value.field);
        draftControls = Object.freeze({ ...draftControls, [value.field]: value.value });
        draftGeometry = geometryFromControls();
        draftPresentation = presentationFromControls();
        draftRevision += 1;
        status = 'selected';
        await replacePreview();
        return snapshot();
      });
    },
  });
}
