import * as bus from '../event-bus.js';
import { clearSelection as clearPdaSelection } from '../pda/pda-selection.js';
import { clearSegmentGroupSelection, clearSegmentSelection } from '../segment/segment-selection.js';
import { clearOrderSetupElementSelection } from '../order/order-setup-selection.js';
import { clearLiveRecordElementSelection } from '../live-record/live-record-selection.js';
import { getSmtRecordById } from './smt-store.js';
import { hitTestSmtRecords } from './smt-hit-test.js';

let selectedSmt = null;

export function getSelectedSmt() {
  return selectedSmt ? { ...selectedSmt } : null;
}

export function selectSmt(id, { chartId = 'primary' } = {}) {
  const record = getSmtRecordById(id);
  if (!record) {
    clearSmtSelection();
    return null;
  }
  selectedSmt = {
    kind: 'smt',
    id: record.id,
    type: record.type,
    chartId,
  };
  clearPdaSelection();
  clearSegmentSelection();
  clearSegmentGroupSelection();
  clearOrderSetupElementSelection();
  clearLiveRecordElementSelection();
  bus.emit('smt:selected', { selection: getSelectedSmt(), record });
  return getSelectedSmt();
}

export function clearSmtSelection() {
  if (!selectedSmt) return;
  selectedSmt = null;
  bus.emit('smt:selection-cleared');
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
  const hit = hitTestSmtRecords({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    chartId: 'primary',
  });
  if (hit?.id) selectSmt(hit.id, { chartId: 'primary' });
  else clearSmtSelection();
}

function handleSecondaryChartClick(e) {
  if (shouldIgnoreClick(e)) return;
  const chartEl = document.getElementById('secondary-chart');
  if (!chartEl) return;
  const rect = chartEl.getBoundingClientRect();
  const hit = hitTestSmtRecords({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    chartId: 'secondary',
  });
  if (hit?.id) selectSmt(hit.id, { chartId: 'secondary' });
  else clearSmtSelection();
}

function handleKeydown(e) {
  if (e.key === 'Escape') clearSmtSelection();
}

function handleSmtChanged() {
  if (!selectedSmt) return;
  if (!getSmtRecordById(selectedSmt.id)) clearSmtSelection();
}

export function initSmtSelection() {
  document.getElementById('chart')?.addEventListener('click', handleChartClick, true);
  document.getElementById('secondary-chart')?.addEventListener('click', handleSecondaryChartClick, true);
  window.addEventListener('keydown', handleKeydown);
  bus.on('smt:changed', handleSmtChanged);
  bus.on('pda:selected', clearSmtSelection);
  bus.on('segment:selected', clearSmtSelection);
  bus.on('segment-group:selected', clearSmtSelection);
  bus.on('order-setup-element:selected', clearSmtSelection);
  bus.on('live-record-element:selected', clearSmtSelection);
  bus.on('bars:cleared', clearSmtSelection);
  bus.on('secondary-bars:cleared', clearSmtSelection);
}
