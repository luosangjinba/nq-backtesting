// Selection state for editable Order Setup chart elements.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { setActiveReviewSet } from './order-review-active.js';
import { getOrderReviewById } from './order-review-store.js';
import { hitTestOrderSetupElements } from './order-setup-hit-test.js';

let selectedElement = null;

export function getSelectedOrderSetupElement() {
  return selectedElement ? { ...selectedElement } : null;
}

export function selectOrderSetupElement(setupId, element) {
  const normalizedSetupId = String(setupId || '').trim();
  const normalizedElement = String(element || '').trim();
  if (!normalizedSetupId || !normalizedElement || !getOrderReviewById(normalizedSetupId)) {
    clearOrderSetupElementSelection();
    return null;
  }
  selectedElement = {
    kind: 'order-setup-element',
    setupId: normalizedSetupId,
    element: normalizedElement,
  };
  setActiveReviewSet(normalizedSetupId);
  bus.emit('order-setup-element:selected', { selection: getSelectedOrderSetupElement() });
  return getSelectedOrderSetupElement();
}

export function clearOrderSetupElementSelection() {
  if (!selectedElement) return;
  selectedElement = null;
  bus.emit('order-setup-element:selection-cleared');
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
  const hit = hitTestOrderSetupElements({ x, y }).primaryHit;
  if (hit?.setupId && hit?.element) {
    selectOrderSetupElement(hit.setupId, hit.element);
  } else {
    clearOrderSetupElementSelection();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') clearOrderSetupElementSelection();
}

function handleOrderReviewsChanged() {
  if (!selectedElement) return;
  if (!getOrderReviewById(selectedElement.setupId)) clearOrderSetupElementSelection();
}

export function initOrderSetupElementSelection() {
  document.getElementById('chart')?.addEventListener('click', handleChartClick, true);
  window.addEventListener('keydown', handleKeydown);
  bus.on('order-review:changed', handleOrderReviewsChanged);
  bus.on('bars:cleared', clearOrderSetupElementSelection);
}
