import * as bus from '../event-bus.js';
import { getAnnotations, loadAnnotations } from '../pda/pda-store.js';
import { getSegments, loadSegments } from '../segment/segment-store.js';
import {
  getSegmentGroupState,
  loadSegmentGroupState,
} from '../segment/segment-group-store.js';
import { getSmtRecords, loadSmtRecords } from '../smt/smt-store.js';
import { getOrderReviews, loadOrderReviews } from '../order/order-review-store.js';
import { getLiveRecords, loadLiveRecords } from '../live-record/live-record-store.js';
import { getActiveLiveRecordId, loadActiveLiveRecordId } from '../live-record/live-record-active.js';
import { getDailyTimeReviews, loadDailyTimeReviews } from '../time-reaction/daily-time-review-store.js';
import {
  getTimeOverlaySettings,
  loadTimeOverlaySettings,
} from '../time-overlays/time-overlay-store.js';
import { getChartNotes, loadChartNotes } from '../chart-notes/chart-note-store.js';
import { getEconomicEventNotes, loadEconomicEventNotes } from '../economic-calendar/economic-event-note-store.js';

const MAX_HISTORY = 100;

let undoStack = [];
let redoStack = [];
let isRestoring = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshotKey(snapshot) {
  return JSON.stringify(snapshot);
}

function emitChanged() {
  bus.emit('history:changed', {
    canUndo: canUndo(),
    canRedo: canRedo(),
    undoLabel: getUndoLabel(),
    redoLabel: getRedoLabel(),
  });
}

export function captureSnapshot() {
  return {
    pdaAnnotations: getAnnotations().filter((annotation) => !annotation.draft),
    segments: getSegments(),
    segmentGroupState: getSegmentGroupState(),
    smtRecords: getSmtRecords(),
    orderReviews: getOrderReviews(),
    liveRecords: getLiveRecords(),
    activeLiveRecordId: getActiveLiveRecordId(),
    dailyTimeReviews: getDailyTimeReviews(),
    timeOverlaySettings: getTimeOverlaySettings(),
    chartNotes: getChartNotes(),
    economicEventNotes: getEconomicEventNotes(),
  };
}

export function restoreSnapshot(snapshot) {
  if (!snapshot) return;
  isRestoring = true;
  try {
    loadAnnotations(clone(snapshot.pdaAnnotations || []));
    loadSegments(clone(snapshot.segments || []));
    loadSegmentGroupState(clone(snapshot.segmentGroupState || {}));
    loadSmtRecords(clone(snapshot.smtRecords || []));
    loadOrderReviews(clone(snapshot.orderReviews || []), { preserveUpdatedAt: true });
    loadLiveRecords(clone(snapshot.liveRecords || []));
    loadActiveLiveRecordId(snapshot.activeLiveRecordId || null);
    loadDailyTimeReviews(clone(snapshot.dailyTimeReviews || []), { preserveUpdatedAt: true });
    loadTimeOverlaySettings(clone(snapshot.timeOverlaySettings || null));
    loadChartNotes(clone(snapshot.chartNotes || []));
    loadEconomicEventNotes(clone(snapshot.economicEventNotes || []));
  } finally {
    isRestoring = false;
  }
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}

export function getUndoLabel() {
  return undoStack.at(-1)?.label || '';
}

export function getRedoLabel() {
  return redoStack.at(-1)?.label || '';
}

export function recordHistory(label, mutator) {
  if (isRestoring || typeof mutator !== 'function') {
    return mutator?.();
  }

  const before = captureSnapshot();
  const beforeKey = snapshotKey(before);
  const finalize = (result) => {
    const after = captureSnapshot();

    if (result !== false && result !== null && snapshotKey(after) !== beforeKey) {
      undoStack = [...undoStack, { label: String(label || 'Change'), snapshot: before }].slice(-MAX_HISTORY);
      redoStack = [];
      emitChanged();
    }

    return result;
  };

  const result = mutator();
  return result?.then ? result.then(finalize) : finalize(result);
}

export function undo() {
  if (!canUndo()) return false;
  const current = captureSnapshot();
  const entry = undoStack.at(-1);
  undoStack = undoStack.slice(0, -1);
  redoStack = [...redoStack, { label: entry.label, snapshot: current }].slice(-MAX_HISTORY);
  restoreSnapshot(entry.snapshot);
  emitChanged();
  bus.emit('status:update', { text: `Undo: ${entry.label}`, isError: false });
  return true;
}

export function redo() {
  if (!canRedo()) return false;
  const current = captureSnapshot();
  const entry = redoStack.at(-1);
  redoStack = redoStack.slice(0, -1);
  undoStack = [...undoStack, { label: entry.label, snapshot: current }].slice(-MAX_HISTORY);
  restoreSnapshot(entry.snapshot);
  emitChanged();
  bus.emit('status:update', { text: `Redo: ${entry.label}`, isError: false });
  return true;
}

function isTextEditingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target?.isContentEditable
  );
}

function handleKeydown(e) {
  const isUndoKey = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z';
  const isRedoKey =
    ((e.ctrlKey || e.metaKey) && !e.altKey && e.shiftKey && e.key.toLowerCase() === 'z') ||
    (e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'y');

  if ((!isUndoKey && !isRedoKey) || isTextEditingTarget(e.target)) return;

  e.preventDefault();
  if (isRedoKey) redo();
  else undo();
}

export function initHistoryManager() {
  window.addEventListener('keydown', handleKeydown);
  emitChanged();
}
