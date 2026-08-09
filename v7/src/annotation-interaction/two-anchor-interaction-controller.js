import { AnnotationInteractionError, failInteraction } from './interaction-error.js';
import {
  requireCommandPort,
  requireFactory,
  requireGeometryContract,
  requireInteractionPort,
  requirePreviewPort,
} from './interaction-ports.js';
import { createDrawingPreviewSession } from './drawing-preview-session.js';

const ARM_FIELDS = Object.freeze(['interactionId']);
const EVENT_FIELDS = Object.freeze(['anchor', 'paneId', 'pointerId', 'sequence']);
const ANCHOR_FIELDS = Object.freeze(['epochMs', 'instrumentId', 'price']);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failInteraction(code, `${label} fields must be exact.`);
  }
}

function interactionId(value) {
  exactRecord(value, ARM_FIELDS, 'ANNOTATION_INTERACTION_ARM_INVALID', 'Drawing arm command');
  if (typeof value.interactionId !== 'string' || !ID.test(value.interactionId)) {
    failInteraction('ANNOTATION_INTERACTION_ID_INVALID', 'Interaction id must be one opaque token.');
  }
  return value.interactionId;
}

function rawAnchorEvent(value) {
  exactRecord(value, EVENT_FIELDS, 'ANNOTATION_INTERACTION_EVENT_INVALID', 'Gesture event');
  exactRecord(value.anchor, ANCHOR_FIELDS, 'ANNOTATION_INTERACTION_ANCHOR_INVALID', 'Gesture anchor');
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 1
    || !Number.isInteger(value.pointerId) || value.pointerId < 0
    || typeof value.paneId !== 'string' || value.paneId.length === 0) {
    failInteraction('ANNOTATION_INTERACTION_EVENT_INVALID', 'Gesture event identity is invalid.');
  }
  return value;
}

/**
 * Own one one-shot generic two-anchor gesture without receiving any DOM, Chart,
 * Series, Canvas, Replay, Workspace, Bar, or persistence handle.
 */
export function createTwoAnchorInteractionController({
  createGeometryInput,
  createGeometryMethod,
  commandPort,
  createPreviewIdentity,
  geometryContract,
  interactionPort,
  onError = () => {},
  onStateChange = () => {},
  previewPort,
  projectPreview,
  toolLabel,
} = {}) {
  const commands = requireCommandPort(commandPort);
  const geometry = requireGeometryContract(geometryContract, createGeometryMethod);
  const gestures = requireInteractionPort(interactionPort);
  const previews = requirePreviewPort(previewPort);
  const identityFactory = requireFactory(
    createPreviewIdentity,
    'ANNOTATION_INTERACTION_PREVIEW_IDENTITY_FACTORY_INVALID',
    'Preview identity factory',
  );
  const projector = requireFactory(
    projectPreview,
    'ANNOTATION_INTERACTION_PROJECTOR_INVALID',
    'Preview projector',
  );
  const geometryInput = requireFactory(
    createGeometryInput,
    'ANNOTATION_INTERACTION_GEOMETRY_FACTORY_INVALID',
    'Geometry input factory',
  );
  if (!['Rectangle', 'Segment'].includes(toolLabel)) {
    failInteraction('ANNOTATION_INTERACTION_TOOL_INVALID', 'Two-anchor tool label is invalid.');
  }
  if (typeof onError !== 'function' || typeof onStateChange !== 'function') {
    failInteraction('ANNOTATION_INTERACTION_CALLBACK_INVALID', 'Interaction callbacks must be functions.');
  }

  let acceptedCommitCount = 0;
  let commandAttemptCount = 0;
  let disposed = false;
  let endAnchor = null;
  let interaction = null;
  let lastCancelReason = null;
  let lastError = null;
  let lastSequence = 0;
  let lease = null;
  let pendingSettlement = Promise.resolve();
  let previewSession = null;
  let startAnchor = null;
  let status = 'idle';

  function snapshot() {
    const preview = previewSession?.snapshot() ?? { revision: 0, visible: false };
    return Object.freeze({
      acceptedCommitCount,
      commandAttemptCount,
      interactionId: interaction,
      lastCancelReason,
      lastErrorCode: lastError?.code ?? null,
      lastSequence,
      previewRevision: preview.revision,
      previewVisible: preview.visible,
      status,
    });
  }

  function publish() {
    try { onStateChange(snapshot()); } catch { /* Presentation callbacks never own controller state. */ }
  }

  function setStatus(value) {
    status = value;
    publish();
  }

  function recordError(code, message, cause) {
    const error = new AnnotationInteractionError(code, message, { cause });
    lastError = error;
    try { onError(error); } catch { /* The stable interaction failure remains authoritative. */ }
    return error;
  }

  function brandAnchor(event) {
    const value = rawAnchorEvent(event);
    if (value.sequence <= lastSequence) return null;
    lastSequence = value.sequence;
    return geometry.createMarketAnchor(value.anchor);
  }

  function geometryBetween(first, second) {
    return geometry[createGeometryMethod](geometryInput(first, second));
  }

  function projectionFor(segment, revision) {
    return projector(Object.freeze({
      geometry: segment,
      interactionId: interaction,
      revision,
    }));
  }

  function schedulePreview(drawingGeometry) {
    const pendingPreview = previewSession.replace(drawingGeometry);
    pendingPreview.catch((cause) => {
      if (status !== 'drawing') return;
      recordError('ANNOTATION_INTERACTION_PREVIEW_FAILED', `${toolLabel} Preview failed.`, cause);
      lease?.release('preview-failed');
    });
    publish();
    return pendingPreview;
  }

  async function clearPreview() {
    await previewSession?.clear();
  }

  function resetInteraction() {
    endAnchor = null;
    interaction = null;
    lastSequence = 0;
    lease = null;
    previewSession = null;
    startAnchor = null;
  }

  function beginCancel(reason) {
    if (disposed || status === 'idle' || status === 'cancelling' || status === 'committing') return;
    lastCancelReason = typeof reason === 'string' && reason.length > 0 ? reason : 'cancelled';
    lease = null;
    setStatus('cancelling');
    pendingSettlement = (async () => {
      try {
        await previewSession?.flush().catch(() => {});
        await clearPreview();
      } catch (cause) {
        recordError(
          'ANNOTATION_INTERACTION_CANCEL_FAILED',
          `${toolLabel} cancellation could not clear Preview.`,
          cause,
        );
      } finally {
        resetInteraction();
        if (!disposed) setStatus('idle');
      }
    })();
  }

  function onStart(event) {
    if (status !== 'armed') return;
    try {
      const anchor = brandAnchor(event);
      if (anchor === null) return;
      startAnchor = anchor;
      setStatus('drawing');
    } catch (cause) {
      recordError('ANNOTATION_INTERACTION_START_FAILED', `${toolLabel} start anchor was rejected.`, cause);
      lease?.release('start-failed');
    }
  }

  function onMove(event) {
    if (status !== 'drawing' || startAnchor === null) return;
    try {
      const anchor = brandAnchor(event);
      if (anchor === null) return;
      const drawingGeometry = geometryBetween(startAnchor, anchor);
      endAnchor = anchor;
      schedulePreview(drawingGeometry);
    } catch (cause) {
      if (['SEGMENT_DEGENERATE', 'RECTANGLE_TIME_RANGE_DEGENERATE',
        'RECTANGLE_PRICE_RANGE_DEGENERATE'].includes(cause?.code)) return;
      recordError('ANNOTATION_INTERACTION_MOVE_FAILED', `${toolLabel} move was rejected.`, cause);
      lease?.release('move-failed');
    }
  }

  function onEnd(event) {
    if (status !== 'drawing' || startAnchor === null) return;
    lease = null;
    let finalGeometry;
    try {
      const anchor = brandAnchor(event);
      if (anchor === null) return;
      endAnchor = anchor;
      finalGeometry = geometryBetween(startAnchor, endAnchor);
      schedulePreview(finalGeometry);
    } catch (cause) {
      recordError('ANNOTATION_INTERACTION_END_FAILED', `${toolLabel} end anchor was rejected.`, cause);
      beginCancel('end-failed');
      return;
    }
    setStatus('committing');
    const committedInteraction = interaction;
    pendingSettlement = (async () => {
      try {
        await previewSession.flush();
        commandAttemptCount += 1;
        await commands.createDrawing(Object.freeze({
          geometry: finalGeometry,
          interactionId: committedInteraction,
        }));
        acceptedCommitCount += 1;
        await clearPreview();
        lastCancelReason = null;
      } catch (cause) {
        recordError('ANNOTATION_INTERACTION_COMMIT_FAILED', `${toolLabel} Drawing command failed.`, cause);
        try { await clearPreview(); } catch (clearCause) {
          recordError(
            'ANNOTATION_INTERACTION_COMMIT_CLEANUP_FAILED',
            `${toolLabel} command failed and Preview cleanup also failed.`,
            clearCause,
          );
        }
      } finally {
        resetInteraction();
        if (!disposed) setStatus('idle');
      }
    })();
  }

  return Object.freeze({
    arm(input) {
      if (disposed) failInteraction('ANNOTATION_INTERACTION_DISPOSED', 'Interaction controller is disposed.');
      if (status !== 'idle') {
        failInteraction('ANNOTATION_INTERACTION_BUSY', `${toolLabel} interaction is already active.`);
      }
      interaction = interactionId(input);
      lastCancelReason = null;
      lastError = null;
      lastSequence = 0;
      previewSession = createDrawingPreviewSession({
        identity: identityFactory(interaction),
        previewPort: previews,
        project: projectionFor,
      });
      setStatus('armed');
      try {
        lease = gestures.acquire({
          onCancel: ({ reason }) => beginCancel(reason),
          onEnd,
          onMove,
          onStart,
        });
      } catch (cause) {
        resetInteraction();
        setStatus('idle');
        failInteraction(
          'ANNOTATION_INTERACTION_ACQUIRE_FAILED',
          `${toolLabel} interaction could not acquire the Chart gesture lease.`,
          { cause },
        );
      }
      return snapshot();
    },
    cancel(reason = 'cancelled') {
      if (disposed || status === 'idle') return pendingSettlement.then(snapshot);
      if (status === 'committing') return pendingSettlement.then(snapshot);
      if (lease !== null) lease.release(reason);
      else beginCancel(reason);
      return pendingSettlement.then(snapshot);
    },
    async dispose() {
      if (disposed) return snapshot();
      disposed = true;
      if (lease !== null) lease.release('disposed');
      else if (status !== 'idle' && status !== 'committing') beginCancel('disposed');
      await pendingSettlement;
      try { await clearPreview(); } catch { /* Preview owner disposal remains separately authoritative. */ }
      resetInteraction();
      status = 'disposed';
      publish();
      return snapshot();
    },
    async settle() {
      await pendingSettlement;
      return snapshot();
    },
    snapshot,
  });
}
