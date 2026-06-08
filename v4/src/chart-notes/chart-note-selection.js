import * as bus from '../event-bus.js';
import { createRafThrottle } from '../utils/raf-throttle.js';
import { hitTestChartNotes } from './chart-note-hit-test.js';
import { setExpandedChartNote } from './chart-note-renderer.js';

let expandedNoteId = '';

function shouldIgnoreClick(e) {
  return Boolean(
    e.target.closest('.pda-menu') ||
      e.target.closest('#pda-context-menu') ||
      e.target.closest('#secondary-context-menu') ||
      e.target.closest('#viewport-controls') ||
      e.target.closest('#secondary-viewport-controls') ||
      e.target.closest('#replay-controls') ||
      e.target.closest('#inspector-sidebar') ||
      e.target.closest('input, select, button, textarea')
  );
}

function handleChartClick(e) {
  if (shouldIgnoreClick(e)) return;

  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  const rect = chartEl.getBoundingClientRect();
  const hit = hitTestChartNotes({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    expandedNoteId,
  });
  if (!hit?.note) return;

  e.preventDefault();
  e.stopPropagation();
  bus.emit('chart-note:selected', { note: hit.note, hit });
}

function setExpandedNote(noteId) {
  const nextId = noteId || '';
  if (expandedNoteId === nextId) return;
  expandedNoteId = nextId;
  setExpandedChartNote(expandedNoteId);
}

function handleChartMouseMove(e) {
  if (shouldIgnoreClick(e)) {
    setExpandedNote('');
    return;
  }

  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  const rect = chartEl.getBoundingClientRect();
  const hit = hitTestChartNotes({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    expandedNoteId,
  });
  setExpandedNote(hit?.note?.id || '');
}

const handleChartMouseMoveThrottled = createRafThrottle(handleChartMouseMove);

function handleChartMouseLeave() {
  setExpandedNote('');
}

export function initChartNoteSelection() {
  const chartEl = document.getElementById('chart');
  chartEl?.addEventListener('click', handleChartClick, true);
  chartEl?.addEventListener('mousemove', handleChartMouseMoveThrottled);
  chartEl?.addEventListener('mouseleave', handleChartMouseLeave);
}
