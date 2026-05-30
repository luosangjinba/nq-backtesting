// Current market segment selection state and chart click wiring.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { getSecondaryChartContext } from '../chart/chart-context.js';
import { clearSelection as clearPdaSelection } from '../pda/pda-selection.js';
import { getIsolatedSegment, getSegmentById, resetAllSegmentDisplayModes } from './segment-store.js';
import { getSegmentGroupById } from './segment-group-store.js';
import { hitTestSegmentGroups, hitTestSegments } from './segment-hit-test.js';

let selectedSegment = null;
let selectedSegmentGroup = null;

export function getSelectedSegment() {
  return selectedSegment ? { ...selectedSegment } : null;
}

export function getSelectedSegmentGroup() {
  return selectedSegmentGroup ? { ...selectedSegmentGroup } : null;
}

export function selectSegment(id) {
  const segment = getSegmentById(id);
  if (!segment) {
    clearSegmentSelection();
    return null;
  }

  clearPdaSelection();
  clearSegmentGroupSelection();
  if (!getIsolatedSegment()) resetAllSegmentDisplayModes();
  const nextSegment = getSegmentById(id);
  selectedSegment = {
    kind: 'market-segment',
    id: nextSegment.id,
  };
  bus.emit('segment:selected', { selection: getSelectedSegment(), segment: nextSegment });
  return getSelectedSegment();
}

export function clearSegmentSelection() {
  if (!selectedSegment) return;
  selectedSegment = null;
  bus.emit('segment:selection-cleared');
}

export function selectSegmentGroup(id) {
  const group = getSegmentGroupById(id);
  if (!group) {
    clearSegmentGroupSelection();
    return null;
  }

  clearPdaSelection();
  clearSegmentSelection();
  selectedSegmentGroup = {
    kind: 'segment-group',
    id: group.id,
  };
  bus.emit('segment-group:selected', { selection: getSelectedSegmentGroup(), segmentGroup: group });
  return getSelectedSegmentGroup();
}

export function clearSegmentGroupSelection() {
  if (!selectedSegmentGroup) return;
  selectedSegmentGroup = null;
  bus.emit('segment-group:selection-cleared');
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
  const segmentHit = hitTestSegments({ x, y });
  const groupHit = hitTestSegmentGroups({ x, y });

  if (groupHit && (!segmentHit || groupHit.distance < segmentHit.distance)) {
    selectSegmentGroup(groupHit.id);
  } else if (segmentHit) {
    selectSegment(segmentHit.id);
  } else {
    clearSegmentSelection();
    clearSegmentGroupSelection();
  }
}

function handleSecondaryChartClick(e) {
  if (shouldIgnoreClick(e)) return;

  const chartEl = document.getElementById('secondary-chart');
  if (!chartEl) return;
  const context = getSecondaryChartContext();
  if (!context.enabled) return;

  const rect = chartEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const segmentHit = hitTestSegments({ x, y, context });
  const groupHit = hitTestSegmentGroups({ x, y, context });

  if (groupHit && (!segmentHit || groupHit.distance < segmentHit.distance)) {
    selectSegmentGroup(groupHit.id);
  } else if (segmentHit) {
    selectSegment(segmentHit.id);
  } else {
    clearSegmentSelection();
    clearSegmentGroupSelection();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    clearSegmentSelection();
    clearSegmentGroupSelection();
  }
}

function handleSegmentChanged() {
  if (!selectedSegment) return;
  if (!getSegmentById(selectedSegment.id)) clearSegmentSelection();
}

function handleSegmentGroupChanged() {
  if (!selectedSegmentGroup) return;
  if (!getSegmentGroupById(selectedSegmentGroup.id)) clearSegmentGroupSelection();
}

export function initSegmentSelection() {
  document.getElementById('chart')?.addEventListener('click', handleChartClick);
  document.getElementById('secondary-chart')?.addEventListener('click', handleSecondaryChartClick);
  window.addEventListener('keydown', handleKeydown);
  bus.on('segment:changed', handleSegmentChanged);
  bus.on('segment-group:changed', handleSegmentGroupChanged);
  bus.on('pda:selected', clearSegmentSelection);
  bus.on('pda:selected', clearSegmentGroupSelection);
  bus.on('bars:cleared', clearSegmentSelection);
  bus.on('bars:cleared', clearSegmentGroupSelection);
}
