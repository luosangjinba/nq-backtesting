// Current PDA selection state and chart click selection wiring.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { getComparisonChartContext } from '../chart/chart-context.js';
import { getAnnotationById } from './pda-store.js';
import { hitTestPdaAnnotations } from './pda-hit-test.js';

let selectedPda = null;

export function getSelectedPda() {
  return selectedPda ? { ...selectedPda } : null;
}

export function selectPda(id) {
  const annotation = getAnnotationById(id);
  if (!annotation) {
    clearSelection();
    return null;
  }

  selectedPda = {
    kind: 'pda',
    id: annotation.id,
    type: annotation.type,
  };
  bus.emit('pda:selected', { selection: getSelectedPda(), annotation });
  return getSelectedPda();
}

export function clearSelection() {
  if (!selectedPda) return;
  selectedPda = null;
  bus.emit('pda:selection-cleared');
}

function shouldIgnoreClick(e) {
  return Boolean(
    e.target.closest('.pda-menu') ||
      e.target.closest('#pda-context-menu') ||
      e.target.closest('#comparison-context-menu') ||
      e.target.closest('#viewport-controls') ||
      e.target.closest('#comparison-viewport-controls') ||
      e.target.closest('#replay-controls') ||
      e.target.closest('#inspector-sidebar') ||
      e.target.closest('input, select, button, textarea')
  );
}

function handleComparisonChartClick(e) {
  if (shouldIgnoreClick(e)) return;

  const chartEl = document.getElementById('comparison-chart-canvas');
  if (!chartEl) return;
  const context = getComparisonChartContext();
  if (!context.enabled) return;

  const rect = chartEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const time = context.coordinateToTime(x);
  const price = context.coordinateToPrice(y);
  const hit = hitTestPdaAnnotations({ x, y, time, price, context });

  if (hit) {
    selectPda(hit.id);
  } else {
    clearSelection();
  }
}

function handleChartClick(e) {
  if (shouldIgnoreClick(e)) return;

  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  const rect = chartEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const time = chart.coordinateToTime(x);
  const price = chart.coordinateToPrice(y);
  const hit = hitTestPdaAnnotations({ x, y, time, price });

  if (hit) {
    selectPda(hit.id);
  } else {
    clearSelection();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') clearSelection();
}

function handlePdaChanged() {
  if (!selectedPda) return;
  if (!getAnnotationById(selectedPda.id)) clearSelection();
}

export function initPdaSelection() {
  document.getElementById('chart')?.addEventListener('click', handleChartClick);
  bindComparisonPdaSelectionClick();
  window.addEventListener('keydown', handleKeydown);
  bus.on('pda:changed', handlePdaChanged);
  bus.on('bars:cleared', clearSelection);
}

let comparisonPdaSelectionBound = false;

function bindComparisonPdaSelectionClick() {
  if (comparisonPdaSelectionBound) return;
  const chartEl = document.getElementById('comparison-chart-canvas');
  if (!chartEl) {
    requestAnimationFrame(bindComparisonPdaSelectionClick);
    return;
  }
  chartEl.addEventListener('click', handleComparisonChartClick);
  comparisonPdaSelectionBound = true;
}
