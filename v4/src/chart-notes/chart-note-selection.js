import * as bus from '../event-bus.js';
import { hitTestChartNotes } from './chart-note-hit-test.js';

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
  });
  if (!hit?.note) return;

  e.preventDefault();
  e.stopPropagation();
  bus.emit('chart-note:selected', { note: hit.note, hit });
}

export function initChartNoteSelection() {
  document.getElementById('chart')?.addEventListener('click', handleChartClick, true);
}
