import { AnnotationBarPickerError, failBarPicker } from './bar-picker-error.js';
import {
  requireBarPickerCallback,
  requireBarPickerInteractionPort,
} from './bar-picker-ports.js';
import { createExactAnnotationBarSelection } from './exact-bar-selection.js';

const ARM_FIELDS = Object.freeze(['pickerId']);
const EVENT_FIELDS = Object.freeze(['barStartEpochMs', 'paneId', 'sequence']);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failBarPicker(code, `${label} fields must be exact.`);
  }
}

function readPickerId(value) {
  exactRecord(value, ARM_FIELDS, 'ANNOTATION_BAR_PICKER_ARM_INVALID', 'Bar Picker arm command');
  if (typeof value.pickerId !== 'string' || !ID.test(value.pickerId)) {
    failBarPicker('ANNOTATION_BAR_PICKER_ID_INVALID', 'Bar Picker id must be one opaque token.');
  }
  return value.pickerId;
}

function readEvent(value) {
  exactRecord(value, EVENT_FIELDS, 'ANNOTATION_BAR_PICKER_EVENT_INVALID', 'Bar Picker event');
  if (!Number.isSafeInteger(value.barStartEpochMs) || value.barStartEpochMs < 0
    || typeof value.paneId !== 'string' || !ID.test(value.paneId)
    || !Number.isSafeInteger(value.sequence) || value.sequence < 1) {
    failBarPicker('ANNOTATION_BAR_PICKER_EVENT_INVALID', 'Bar Picker event values are invalid.');
  }
  return value;
}

/** Own one removable one-shot exact Bar selection session over a Chart-owned port. */
export function createExactAnnotationBarPickerController({
  interactionPort,
  onError = () => {},
  onSelection = () => {},
  onStateChange = () => {},
} = {}) {
  const interactions = requireBarPickerInteractionPort(interactionPort);
  const errorSubscriber = requireBarPickerCallback(
    onError,
    'ANNOTATION_BAR_PICKER_CALLBACK_INVALID',
    'Bar Picker error callback',
  );
  const selectionSubscriber = requireBarPickerCallback(
    onSelection,
    'ANNOTATION_BAR_PICKER_CALLBACK_INVALID',
    'Bar Picker selection callback',
  );
  const stateSubscriber = requireBarPickerCallback(
    onStateChange,
    'ANNOTATION_BAR_PICKER_CALLBACK_INVALID',
    'Bar Picker state callback',
  );
  let acceptedSelectionCount = 0;
  let candidateSelection = null;
  let disposed = false;
  let lastCancelReason = null;
  let lastError = null;
  let lastSelection = null;
  let lastSequence = 0;
  let lease = null;
  let pickerId = null;
  let status = 'idle';

  function snapshot() {
    return Object.freeze({
      acceptedSelectionCount,
      candidateSelection,
      lastCancelReason,
      lastErrorCode: lastError?.code ?? null,
      lastSelection,
      lastSequence,
      pickerId,
      status,
    });
  }

  function publish() {
    try { stateSubscriber(snapshot()); } catch { /* Presentation callbacks never own Picker state. */ }
  }

  function setStatus(value) {
    status = value;
    publish();
  }

  function recordError(code, message, cause) {
    const error = new AnnotationBarPickerError(code, message, { cause });
    lastError = error;
    try { errorSubscriber(error); } catch { /* Stable Picker failure remains authoritative. */ }
    return error;
  }

  function selectionFrom(event) {
    const value = readEvent(event);
    if (value.sequence <= lastSequence) return null;
    lastSequence = value.sequence;
    return createExactAnnotationBarSelection({
      barStartEpochMs: value.barStartEpochMs,
      paneId: value.paneId,
      schemaVersion: 1,
    });
  }

  function resetActive() {
    candidateSelection = null;
    lease = null;
    pickerId = null;
  }

  function onCancel({ reason } = {}) {
    if (status !== 'armed') return;
    lastCancelReason = typeof reason === 'string' && reason.length > 0 ? reason : 'cancelled';
    resetActive();
    if (!disposed) setStatus('idle');
  }

  function onCandidate(event) {
    if (status !== 'armed') return;
    if (event === null) {
      if (candidateSelection !== null) {
        candidateSelection = null;
        publish();
      }
      return;
    }
    try {
      const selection = selectionFrom(event);
      if (selection === null) return;
      candidateSelection = selection;
      publish();
    } catch (cause) {
      recordError('ANNOTATION_BAR_PICKER_CANDIDATE_FAILED', 'Bar candidate was rejected.', cause);
      lease?.release('candidate-failed');
    }
  }

  function onSelect(event) {
    if (status !== 'armed') return;
    lease = null;
    let selection;
    try {
      selection = selectionFrom(event);
      if (selection === null) {
        resetActive();
        setStatus('idle');
        return;
      }
    } catch (cause) {
      recordError('ANNOTATION_BAR_PICKER_SELECTION_FAILED', 'Exact Bar selection was rejected.', cause);
      resetActive();
      setStatus('idle');
      return;
    }
    acceptedSelectionCount += 1;
    lastSelection = selection;
    lastCancelReason = null;
    resetActive();
    setStatus('idle');
    try { selectionSubscriber(selection); } catch (cause) {
      recordError(
        'ANNOTATION_BAR_PICKER_SELECTION_HANDLER_FAILED',
        'Exact Bar selection consumer failed.',
        cause,
      );
      publish();
    }
  }

  return Object.freeze({
    arm(input) {
      if (disposed) failBarPicker('ANNOTATION_BAR_PICKER_DISPOSED', 'Bar Picker is disposed.');
      if (status !== 'idle') {
        failBarPicker('ANNOTATION_BAR_PICKER_BUSY', 'Bar Picker is already active.');
      }
      pickerId = readPickerId(input);
      candidateSelection = null;
      lastCancelReason = null;
      lastError = null;
      lastSequence = 0;
      setStatus('armed');
      try {
        lease = interactions.acquireBarPicker({ onCancel, onCandidate, onSelect });
      } catch (cause) {
        resetActive();
        setStatus('idle');
        failBarPicker(
          'ANNOTATION_BAR_PICKER_ACQUIRE_FAILED',
          'Bar Picker could not acquire the Chart interaction lease.',
          { cause },
        );
      }
      return snapshot();
    },
    cancel(reason = 'cancelled') {
      if (disposed || status === 'idle') return snapshot();
      if (lease !== null) lease.release(reason);
      else onCancel({ reason });
      return snapshot();
    },
    dispose() {
      if (disposed) return snapshot();
      disposed = true;
      if (lease !== null) lease.release('disposed');
      resetActive();
      status = 'disposed';
      publish();
      return snapshot();
    },
    snapshot,
  });
}
