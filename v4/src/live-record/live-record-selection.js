import * as bus from '../event-bus.js';
import { getLiveRecordById } from './live-record-store.js';
import { setActiveLiveRecord } from './live-record-active.js';
import { hitTestLiveRecordElements } from './live-record-hit-test.js';

let selectedElement = null;

export function getSelectedLiveRecordElement() {
  return selectedElement ? { ...selectedElement } : null;
}

export function selectLiveRecordElement(liveRecordId, element) {
  const normalizedLiveRecordId = String(liveRecordId || '').trim();
  const normalizedElement = String(element || '').trim();
  if (!normalizedLiveRecordId || !normalizedElement || !getLiveRecordById(normalizedLiveRecordId)) {
    clearLiveRecordElementSelection();
    return null;
  }
  selectedElement = {
    kind: 'live-record-element',
    liveRecordId: normalizedLiveRecordId,
    element: normalizedElement,
  };
  setActiveLiveRecord(normalizedLiveRecordId);
  bus.emit('live-record-element:selected', { selection: getSelectedLiveRecordElement() });
  return getSelectedLiveRecordElement();
}

export function clearLiveRecordElementSelection() {
  if (!selectedElement) return;
  selectedElement = null;
  bus.emit('live-record-element:selection-cleared');
}

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
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const hit = hitTestLiveRecordElements({ x, y }).primaryHit;
  if (hit?.liveRecordId && hit?.element) {
    selectLiveRecordElement(hit.liveRecordId, hit.element);
  } else {
    clearLiveRecordElementSelection();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') clearLiveRecordElementSelection();
}

function handleLiveRecordsChanged() {
  if (!selectedElement) return;
  if (!getLiveRecordById(selectedElement.liveRecordId)) clearLiveRecordElementSelection();
}

export function initLiveRecordElementSelection() {
  document.getElementById('chart')?.addEventListener('click', handleChartClick, true);
  window.addEventListener('keydown', handleKeydown);
  bus.on('live-record:changed', handleLiveRecordsChanged);
  bus.on('bars:cleared', clearLiveRecordElementSelection);
}
