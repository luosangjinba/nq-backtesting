import { failAnnotation } from './annotation-error.js';

export const ANNOTATION_HISTORY_LIMIT = 100;

function freezeEntry(document, opaqueState) {
  return Object.freeze({ document, opaqueState });
}

function freezeHistory(undo, redo) {
  return Object.freeze({ redo: Object.freeze([...redo]), undo: Object.freeze([...undo]) });
}

function bounded(values) {
  return values.length <= ANNOTATION_HISTORY_LIMIT
    ? values : values.slice(values.length - ANNOTATION_HISTORY_LIMIT);
}

/** Create one immutable empty Runtime history. */
export function createEmptyAnnotationHistory() {
  return freezeHistory([], []);
}

/** Restore and brand adapter-provided document/history state through one Runtime callback. */
export function restoreAnnotationHistoryState(initialState, restoreDocument) {
  if (!initialState || typeof initialState !== 'object' || Array.isArray(initialState)
    || Object.keys(initialState).sort().join(',') !== 'document,history,opaqueState'
    || !initialState.history || typeof initialState.history !== 'object'
    || Object.keys(initialState.history).sort().join(',') !== 'redo,undo'
    || !Array.isArray(initialState.history.undo) || !Array.isArray(initialState.history.redo)
    || typeof restoreDocument !== 'function') {
    failAnnotation('ANNOTATION_RESTORED_STATE_INVALID', 'Restored Annotation state is invalid.');
  }
  const restoreEntry = (entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || Object.keys(entry).sort().join(',') !== 'document,opaqueState') {
      failAnnotation('ANNOTATION_RESTORED_HISTORY_INVALID', 'Restored history entry is invalid.');
    }
    return freezeEntry(restoreDocument(entry.document), entry.opaqueState);
  };
  if (initialState.history.undo.length > ANNOTATION_HISTORY_LIMIT
    || initialState.history.redo.length > ANNOTATION_HISTORY_LIMIT) {
    failAnnotation('ANNOTATION_RESTORED_HISTORY_BOUNDS_EXCEEDED', 'Restored history exceeds its bound.');
  }
  return Object.freeze({
    document: restoreDocument(initialState.document),
    history: freezeHistory(
      initialState.history.undo.map(restoreEntry),
      initialState.history.redo.map(restoreEntry),
    ),
    opaqueState: initialState.opaqueState,
  });
}

/** Advance ordinary accepted work, preserving one exact undo state and clearing redo. */
export function advanceAnnotationHistory(current, document, opaqueState = current.opaqueState) {
  const undo = bounded([
    ...current.history.undo,
    freezeEntry(current.document, current.opaqueState),
  ]);
  return Object.freeze({
    document,
    history: freezeHistory(undo, []),
    opaqueState,
  });
}

/** Build one undo/redo candidate without publishing it. */
export function traverseAnnotationHistory(current, direction, rebase) {
  const source = direction === 'undo' ? current.history.undo : current.history.redo;
  if (!['redo', 'undo'].includes(direction) || source.length === 0 || typeof rebase !== 'function') {
    failAnnotation(
      direction === 'redo' ? 'ANNOTATION_REDO_UNAVAILABLE' : 'ANNOTATION_UNDO_UNAVAILABLE',
      `Annotation ${direction} history is empty.`,
    );
  }
  const target = source.at(-1);
  const currentEntry = freezeEntry(current.document, current.opaqueState);
  const undo = direction === 'undo'
    ? current.history.undo.slice(0, -1)
    : bounded([...current.history.undo, currentEntry]);
  const redo = direction === 'redo'
    ? current.history.redo.slice(0, -1)
    : bounded([...current.history.redo, currentEntry]);
  return Object.freeze({
    document: rebase(target.document),
    history: freezeHistory(undo, redo),
    opaqueState: target.opaqueState,
  });
}

/** Expose only immutable history depth/capability metadata. */
export function annotationHistorySnapshot(history) {
  return Object.freeze({
    canRedo: history.redo.length > 0,
    canUndo: history.undo.length > 0,
    limit: ANNOTATION_HISTORY_LIMIT,
    redoDepth: history.redo.length,
    undoDepth: history.undo.length,
  });
}
