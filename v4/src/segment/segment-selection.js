// Current market segment selection state and chart click wiring.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { clearSelection as clearPdaSelection } from '../pda/pda-selection.js';
import { getSegmentById } from './segment-store.js';
import { hitTestSegments } from './segment-hit-test.js';

let selectedSegment = null;

export function getSelectedSegment() {
  return selectedSegment ? { ...selectedSegment } : null;
}

export function selectSegment(id) {
  const segment = getSegmentById(id);
  if (!segment) {
    clearSegmentSelection();
    return null;
  }

  clearPdaSelection();
  selectedSegment = {
    kind: 'market-segment',
    id: segment.id,
  };
  bus.emit('segment:selected', { selection: getSelectedSegment(), segment });
  return getSelectedSegment();
}

export function clearSegmentSelection() {
  if (!selectedSegment) return;
  selectedSegment = null;
  bus.emit('segment:selection-cleared');
}

function shouldIgnoreClick(e) {
  return Boolean(
    e.target.closest('.pda-menu') ||
      e.target.closest('#pda-context-menu') ||
      e.target.closest('#viewport-controls') ||
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
  const hit = hitTestSegments({ x, y });

  if (hit) {
    selectSegment(hit.id);
  } else {
    clearSegmentSelection();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') clearSegmentSelection();
}

function handleSegmentChanged() {
  if (!selectedSegment) return;
  if (!getSegmentById(selectedSegment.id)) clearSegmentSelection();
}

export function initSegmentSelection() {
  document.getElementById('chart')?.addEventListener('click', handleChartClick);
  window.addEventListener('keydown', handleKeydown);
  bus.on('segment:changed', handleSegmentChanged);
  bus.on('pda:selected', clearSegmentSelection);
  bus.on('bars:cleared', clearSegmentSelection);
}
