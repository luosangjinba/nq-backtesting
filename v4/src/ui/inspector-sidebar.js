// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as viewport from '../chart/viewport-controller.js';
import * as secondaryViewport from '../chart/secondary-viewport-controller.js';
import { clearSelection as clearPdaSelection, getSelectedPda, selectPda } from '../pda/pda-selection.js';
import { exportPdaArchive, importPdaArchive } from '../pda/pda-archive.js';
import { exportReviewArchive, importReviewArchive } from '../review/review-archive.js';
import { clearSavedAnnotations } from '../pda/pda-persistence.js';
import { getAnnotationById } from '../pda/pda-store.js';
import {
  clearSegmentGroupSelection,
  clearSegmentSelection,
  getSelectedSegment,
  getSelectedSegmentGroup,
  selectSegment,
  selectSegmentGroup,
} from '../segment/segment-selection.js';
import { getSegmentById } from '../segment/segment-store.js';
import { getSegmentGroupById } from '../segment/segment-group-store.js';
import { getDrawingSets, isDrawingSetFocused, locateDrawingSet } from '../segment/drawing-set-list.js';
import { renderArchiveActions } from './inspector/archive-panel.js';
import { renderAnnotationPanel } from './inspector/pda-panel.js';
import { renderSegmentPanel } from './inspector/segment-panel.js';
import { renderSegmentGroupPanel } from './inspector/segment-group-panel.js';
import { renderSmtPanel } from './inspector/smt-panel.js';
import { renderOrderReviewDetailPanel } from './inspector/order-review-panel.js';
import { createOrderReviewActionController } from './inspector/order-review-actions.js';
import {
  canPopInspectorPage,
  getInspectorPage,
  popInspectorPage,
  pushInspectorPage,
  replaceInspectorPage,
  resetInspectorPage,
} from './inspector/page-stack.js';
import { createPdaInspectorActionController } from './inspector/pda-actions.js';
import { createSegmentInspectorActionController } from './inspector/segment-actions.js';
import {
  getDefaultCalendarDate,
  getCalendarDateTimestamp,
  getNextCalendarViewDate,
  renderCalendarPanel,
} from './inspector/calendar-panel.js';
import { updateTimeOverlaySettings } from '../time-overlays/time-overlay-store.js';
import { updateEconomicCalendarFilters } from '../economic-calendar/economic-calendar-store.js';
import { deleteSmtRecord, getSmtRecordById, getSmtRecords, updateSmtRecord } from '../smt/smt-store.js';
import {
  getActiveReviewSetId,
  setActiveReviewSet,
} from '../order/order-review-active.js';
import { getSelectedOrderSetupElement } from '../order/order-setup-selection.js';
import {
  getOrderReviewById,
} from '../order/order-review-store.js';
import { recordHistory } from '../history/history-manager.js';

let sidebarEl = null;
let bodyEl = null;
let currentPanel = 'empty';
let expandedOrderReviewId = null;
let selectedSmtId = null;
let calendarSelectedDate = '';
let calendarViewDate = '';
let suppressActiveReviewRender = false;

const orderReviewActions = createOrderReviewActionController({
  getExpandedOrderReviewId: () => expandedOrderReviewId,
  setExpandedOrderReviewId: (orderReviewId) => {
    expandedOrderReviewId = orderReviewId;
  },
  getSelectedSmtId: () => selectedSmtId,
  getCompositeTimestamp,
  syncCalendarToOrderReview,
  refreshSelection,
});

const pdaActions = createPdaInspectorActionController({
  getCurrentAnnotation,
  renderEmpty: renderAfterDetailDeleted,
});

const segmentActions = createSegmentInspectorActionController({
  getCurrentSegment,
  getCurrentSegmentGroup,
  getBodyEl: () => bodyEl,
  renderEmpty: renderAfterDetailDeleted,
});

function getOrderReviewPanelOptions(extra = {}) {
  return {
    expandedOrderReviewId,
    activeOrderReviewId: getActiveReviewSetId(),
    selectedOrderSetupElement: getSelectedOrderSetupElement(),
    ...extra,
  };
}

function renderInspectorBackAction() {
  if (!canPopInspectorPage()) return '';
  return `
    <div class="inspector-return-bar">
      <button class="inspector-button secondary" data-inspector-action="inspector-back" type="button">
        Back
      </button>
    </div>
  `;
}

function dateKeyFromTimestamp(timestamp) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  const date = new Date(parsed * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOrderReviewCalendarDate(order = {}) {
  return dateKeyFromTimestamp(
    order.entryPlan?.entryTimestamp ??
      order.setupThesis?.primaryEventTimestamp ??
      order.resultReview?.exitTimestamp ??
      null
  );
}

function syncCalendarToOrderReview(orderReviewId) {
  const order = getOrderReviewById(orderReviewId);
  const dateKey = getOrderReviewCalendarDate(order);
  if (!dateKey) return false;
  calendarSelectedDate = dateKey;
  calendarViewDate = dateKey;
  return true;
}

function normalizeCalendarDatePayload(payload = {}) {
  const dateKey = String(payload.dateKey || '').match(/^\d{4}-\d{2}-\d{2}$/)
    ? String(payload.dateKey)
    : dateKeyFromTimestamp(payload.timestamp);
  return dateKey || '';
}

function openCalendarDate(payload = {}) {
  const dateKey = normalizeCalendarDatePayload(payload);
  if (!dateKey) {
    bus.emit('status:update', { text: 'Cannot locate Calendar date: missing chart time', isError: true });
    return false;
  }
  calendarSelectedDate = dateKey;
  calendarViewDate = dateKey;
  updateTimeOverlaySettings({ selectedDate: dateKey });
  clearPdaSelection();
  clearSegmentSelection();
  clearSegmentGroupSelection();
  selectedSmtId = null;
  resetInspectorPage({ kind: 'home', selectedDate: dateKey, viewDate: dateKey });
  renderEmpty();
  openSidebar();
  bus.emit('status:update', {
    text: `Calendar selected ${dateKey}${payload.source ? ` from ${payload.source}` : ''}`,
    isError: false,
  });
  return true;
}

function renderAnnotation(annotation) {
  currentPanel = 'selection';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'pda',
    objectId: annotation.id,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderAnnotationPanel(annotation, renderArchiveActions())}
  `;
}

function renderSegment(segment) {
  currentPanel = 'selection';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'segment',
    objectId: segment.id,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderSegmentPanel(segment)}
  `;
}

function renderSegmentGroup(segmentGroup) {
  currentPanel = 'selection';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'composite',
    objectId: segmentGroup.id,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderSegmentGroupPanel(segmentGroup)}
  `;
}

function renderSmtSelection() {
  currentPanel = 'selection';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'smt',
    objectId: selectedSmtId,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderSmtPanel(getSmtRecords(), { selectedSmtId })}
  `;
}

function renderOrderSetupDetail(orderReviewId) {
  const order = getOrderReviewById(orderReviewId);
  currentPanel = 'detail';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'order-setup',
    objectId: orderReviewId,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderOrderReviewDetailPanel(order, getOrderReviewPanelOptions({
      activeOrderReviewId: orderReviewId,
    }))}
  `;
}

function renderEmpty() {
  currentPanel = 'empty';
  if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
  if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
  replaceInspectorPage({
    kind: 'home',
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    <div class="inspector-empty">
      Select a PDA or 1H segment on the chart.
    </div>
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate })}
    ${renderArchiveActions()}
  `;
}

function renderArchivePanel() {
  currentPanel = 'archive';
  if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
  if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
  replaceInspectorPage({
    kind: 'archive',
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate })}
    ${renderArchiveActions()}
  `;
}

function renderDrawingSetList() {
  const sets = getDrawingSets();
  const rows = sets.length
    ? sets
        .map(
          (set) => {
            const isFocused = isDrawingSetFocused(set.type, set.id);
            return `
            <button class="drawing-set-row${isFocused ? ' active' : ''}" data-inspector-action="drawing-set-locate" data-set-type="${set.type}" data-set-id="${set.id}" type="button" aria-pressed="${isFocused ? 'true' : 'false'}">
              <span class="drawing-set-main">${set.label}</span>
              <span class="drawing-set-meta">${set.detail}</span>
            </button>
          `;
          }
        )
        .join('')
    : '<div class="drawing-set-empty">No segment or composite sets.</div>';

  return `
    <section class="inspector-section drawing-set-section">
      <div class="inspector-section-title">Structure Sets</div>
      <div class="drawing-set-list">${rows}</div>
    </section>
  `;
}

function openSidebar() {
  sidebarEl?.classList.add('open');
}

function closeSidebar() {
  sidebarEl?.classList.remove('open');
}

function focusActiveOrderSetupPanel() {
  const section = bodyEl?.querySelector('[data-inspector-section="order-setup-detail"]');
  section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function showActiveOrderSetupPanel() {
  syncCalendarToOrderReview(getActiveReviewSetId());
  renderOrderSetupDetail(getActiveReviewSetId());
  openSidebar();
  requestAnimationFrame(() => focusActiveOrderSetupPanel());
}

function restoreCalendarStateFromPage(page = {}) {
  if (page.selectedDate) calendarSelectedDate = page.selectedDate;
  if (page.viewDate) calendarViewDate = page.viewDate;
}

function renderPageFromState(page = getInspectorPage()) {
  restoreCalendarStateFromPage(page);
  if (page.kind === 'archive') {
    renderArchivePanel();
    return;
  }
  if (page.kind === 'detail') {
    if (page.objectType === 'order-setup') {
      if (getOrderReviewById(page.objectId)) {
        renderOrderSetupDetail(page.objectId);
        return;
      }
    } else if (page.objectType === 'pda') {
      const annotation = getAnnotationById(page.objectId);
      if (annotation) {
        renderAnnotation(annotation);
        return;
      }
    } else if (page.objectType === 'segment') {
      const segment = getSegmentById(page.objectId);
      if (segment) {
        renderSegment(segment);
        return;
      }
    } else if (page.objectType === 'composite') {
      const segmentGroup = getSegmentGroupById(page.objectId);
      if (segmentGroup) {
        renderSegmentGroup(segmentGroup);
        return;
      }
    } else if (page.objectType === 'smt') {
      if (getSmtRecordById(page.objectId)) {
        selectedSmtId = page.objectId;
        renderSmtSelection();
        return;
      }
    }
    renderPageFromState(popInspectorPage());
    return;
  }
  clearPdaSelection();
  clearSegmentSelection();
  clearSegmentGroupSelection();
  selectedSmtId = null;
  renderEmpty();
}

function renderAfterDetailDeleted() {
  renderPageFromState(popInspectorPage());
}

function refreshSelection() {
  const page = getInspectorPage();
  if (page.kind === 'detail') {
    renderPageFromState(page);
    return;
  }

  if (currentPanel === 'archive') {
    renderArchivePanel();
    return;
  }

  const pdaSelection = getSelectedPda();
  if (pdaSelection) {
    const annotation = getAnnotationById(pdaSelection.id);
    if (annotation) {
      renderAnnotation(annotation);
      return;
    }
  }

  const segmentSelection = getSelectedSegment();
  if (segmentSelection) {
    const segment = getSegmentById(segmentSelection.id);
    if (segment) {
      renderSegment(segment);
      return;
    }
  }

  const segmentGroupSelection = getSelectedSegmentGroup();
  if (segmentGroupSelection) {
    const segmentGroup = getSegmentGroupById(segmentGroupSelection.id);
    if (segmentGroup) {
      renderSegmentGroup(segmentGroup);
      return;
    }
  }

  renderEmpty();
}

function createSidebar() {
  sidebarEl = document.createElement('aside');
  sidebarEl.id = 'inspector-sidebar';
  sidebarEl.innerHTML = `
    <div class="inspector-header">
      <div class="inspector-title">Inspector</div>
      <button class="inspector-close" type="button" title="Close inspector">X</button>
    </div>
    <div class="inspector-body"></div>
  `;
  document.getElementById('workspace')?.appendChild(sidebarEl);
  bodyEl = sidebarEl.querySelector('.inspector-body');
  sidebarEl.querySelector('.inspector-close')?.addEventListener('click', closeSidebar);
  sidebarEl.addEventListener('change', handleInspectorChange);
  sidebarEl.addEventListener('click', handleInspectorClick);
  renderEmpty();
}

function getCurrentAnnotation() {
  const selection = getSelectedPda();
  return selection ? getAnnotationById(selection.id) : null;
}

function getCurrentSegment() {
  const selection = getSelectedSegment();
  return selection ? getSegmentById(selection.id) : null;
}

function getCurrentSegmentGroup() {
  const selection = getSelectedSegmentGroup();
  return selection ? getSegmentGroupById(selection.id) : null;
}

function recordInspectorHistory(label, mutator) {
  return recordHistory(label, mutator);
}

function getCompositeTimestamp(group) {
  const childIds = Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : [];
  const childSegments = childIds.map(getSegmentById).filter(Boolean);
  const terminal = childSegments[childSegments.length - 1];
  return terminal?.end?.timestamp ?? terminal?.end?.time ?? terminal?.start?.timestamp ?? terminal?.start?.time ?? null;
}

function openCalendarObject(type, id) {
  if (!type || !id) return false;
  if (type === 'order-setup') {
    suppressActiveReviewRender = true;
    let selected = false;
    try {
      selected = Boolean(setActiveReviewSet(id));
    } finally {
      suppressActiveReviewRender = false;
    }
    if (!selected) {
      return false;
    }
    if (selected) {
      clearPdaSelection();
      clearSegmentSelection();
      clearSegmentGroupSelection();
      syncCalendarToOrderReview(id);
      pushInspectorPage({
        kind: 'detail',
        objectType: 'order-setup',
        objectId: id,
        selectedDate: calendarSelectedDate,
        viewDate: calendarViewDate,
      });
      renderOrderSetupDetail(id);
    }
    return selected;
  }
  if (type === 'pda') {
    if (!getAnnotationById(id)) return false;
    clearSegmentSelection();
    clearSegmentGroupSelection();
    pushInspectorPage({
      kind: 'detail',
      objectType: 'pda',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    return Boolean(selectPda(id));
  }
  if (type === 'segment') {
    if (!getSegmentById(id)) return false;
    pushInspectorPage({
      kind: 'detail',
      objectType: 'segment',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    return Boolean(selectSegment(id));
  }
  if (type === 'composite') {
    if (!getSegmentGroupById(id)) return false;
    pushInspectorPage({
      kind: 'detail',
      objectType: 'composite',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    return Boolean(selectSegmentGroup(id));
  }
  if (type === 'smt') {
    if (!getSmtRecordById(id)) return false;
    pushInspectorPage({
      kind: 'detail',
      objectType: 'smt',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    selectedSmtId = id;
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderSmtSelection();
    return true;
  }
  return false;
}

function handleInspectorChange(e) {
  const action = e.target.dataset.inspectorAction;
  if (!action) return;

  if (action === 'import-pda-file') {
    importPdaArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  if (action === 'import-review-file') {
    importReviewArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  if (action === 'smt-note') {
    recordInspectorHistory('Update SMT Note', () => updateSmtRecord(e.target.dataset.smtId, { note: e.target.value }));
    return;
  }

  if (orderReviewActions.handleOrderReviewChange(action, e.target)) {
    return;
  }

  if (segmentActions.handleSegmentChange(action, e.target)) {
    return;
  }

  pdaActions.handlePdaChange(action, e.target);
}

function handleInspectorClick(e) {
  const actionEl = e.target.closest('[data-inspector-action]');
  const action = actionEl?.dataset.inspectorAction;
  if (!action) return;

  if (action === 'calendar-select-date') {
    calendarSelectedDate = actionEl.dataset.calendarDate || calendarSelectedDate;
    calendarViewDate = calendarSelectedDate;
    updateTimeOverlaySettings({ selectedDate: calendarSelectedDate });
    const targetTimestamp = getCalendarDateTimestamp(calendarSelectedDate, '09:30');
    if (targetTimestamp !== null) {
      viewport.locateTimestampRange(targetTimestamp, targetTimestamp);
      secondaryViewport.locateSecondaryTimestampRange(targetTimestamp, targetTimestamp);
    }
    bus.emit('status:update', {
      text: targetTimestamp === null
        ? `Calendar selected ${calendarSelectedDate}`
        : `Calendar located ${calendarSelectedDate} 09:30`,
      isError: targetTimestamp === null,
    });
    refreshSelection();
    return;
  }

  if (action === 'calendar-show-all-days') {
    updateTimeOverlaySettings({ selectedDate: '' });
    bus.emit('status:update', { text: 'Calendar overlays show all loaded days', isError: false });
    refreshSelection();
    return;
  }

  if (action === 'economic-calendar-filter') {
    const key = actionEl.dataset.economicFilter;
    if (key) {
      updateEconomicCalendarFilters({ [key]: actionEl.checked });
      refreshSelection();
    }
    return;
  }

  if (action === 'calendar-object-locate') {
    const start = Number(actionEl.dataset.locateStart);
    const end = Number(actionEl.dataset.locateEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      bus.emit('status:update', { text: 'Calendar object has no locatable time', isError: true });
      return;
    }
    viewport.locateTimestampRange(start, end);
    secondaryViewport.locateSecondaryTimestampRange(start, end);
    const label = actionEl.dataset.objectLabel || 'Calendar object';
    bus.emit('status:update', { text: `Located ${label}`, isError: false });
    return;
  }

  if (action === 'calendar-object-open') {
    const opened = openCalendarObject(actionEl.dataset.objectType, actionEl.dataset.objectId);
    bus.emit('status:update', {
      text: opened ? 'Calendar object opened' : 'Calendar object cannot be opened',
      isError: !opened,
    });
    return;
  }

  if (action === 'inspector-back') {
    renderPageFromState(popInspectorPage());
    bus.emit('status:update', { text: 'Returned', isError: false });
    return;
  }

  if (action === 'calendar-prev-month' || action === 'calendar-next-month') {
    calendarViewDate = getNextCalendarViewDate(
      calendarViewDate || calendarSelectedDate || getDefaultCalendarDate(),
      action === 'calendar-prev-month' ? 'prev' : 'next'
    );
    refreshSelection();
    return;
  }

  if (action === 'export-pda') {
    exportPdaArchive();
    return;
  }

  if (action === 'export-review') {
    exportReviewArchive();
    return;
  }

  if (action === 'import-pda') {
    bodyEl?.querySelector('[data-inspector-action="import-pda-file"]')?.click();
    return;
  }

  if (action === 'import-review') {
    bodyEl?.querySelector('[data-inspector-action="import-review-file"]')?.click();
    return;
  }

  if (action === 'clear-saved') {
    clearSavedAnnotations();
    return;
  }

  if (action === 'smt-locate') {
    const record = getSmtRecordById(actionEl.dataset.smtId);
    if (record) {
      viewport.locateTimestampRange(
        record.leftTimestamp ?? record.fvgStartTimestamp ?? record.timestamp,
        record.rightTimestamp ?? record.fvgEndTimestamp ?? record.timestamp
      );
    }
    return;
  }

  if (action === 'smt-delete') {
    const deletedId = actionEl.dataset.smtId;
    recordInspectorHistory('Delete SMT', () => deleteSmtRecord(actionEl.dataset.smtId));
    if (selectedSmtId === deletedId) selectedSmtId = null;
    const page = getInspectorPage();
    if (page.kind === 'detail' && page.objectType === 'smt' && String(page.objectId) === String(deletedId)) {
      renderAfterDetailDeleted();
      return;
    }
    if (currentPanel === 'archive') renderArchivePanel();
    return;
  }

  if (action === 'smt-select') {
    selectedSmtId = actionEl.dataset.smtId;
    refreshSelection();
    return;
  }

  if (orderReviewActions.handleOrderReviewClick(action, actionEl)) {
    return;
  }

  if (action === 'drawing-set-locate') {
    locateDrawingSet(actionEl.dataset.setType, actionEl.dataset.setId);
    return;
  }

  const segment = getCurrentSegment();
  if (segment && orderReviewActions.handleOrderReviewClick(action, actionEl, { segment })) {
    return;
  }

  const segmentGroup = getCurrentSegmentGroup();
  if (segmentGroup && orderReviewActions.handleOrderReviewClick(action, actionEl, { segmentGroup })) {
    return;
  }

  if (segmentActions.handleSegmentClick(action, actionEl)) {
    return;
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (orderReviewActions.handleOrderReviewClick(action, actionEl, { annotation })) {
    return;
  }

  pdaActions.handlePdaClick(action, actionEl);
}

export function initInspectorSidebar() {
  resetInspectorPage({ kind: 'home' });
  createSidebar();
  document.getElementById('chart')?.addEventListener('click', orderReviewActions.handleExitPickChartClick, true);
  document.getElementById('chart')?.addEventListener('click', segmentActions.handleActorPickChartClick, true);
  chart.onCrosshairMove(orderReviewActions.handleExitPickHover);
  chart.onCrosshairMove(segmentActions.handleActorPickHover);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      orderReviewActions.clearExitPickState();
      segmentActions.clearActorPickState();
    }
  });
  bus.on('pda:selected', ({ annotation }) => {
    renderAnnotation(annotation);
    openSidebar();
  });
  bus.on('pda:selection-cleared', refreshSelection);
  bus.on('pda:changed', refreshSelection);
  bus.on('segment:selected', ({ segment }) => {
    renderSegment(segment);
    openSidebar();
  });
  bus.on('segment-group:selected', ({ segmentGroup }) => {
    renderSegmentGroup(segmentGroup);
    openSidebar();
  });
  bus.on('segment:selection-cleared', refreshSelection);
  bus.on('segment-group:selection-cleared', refreshSelection);
  bus.on('segment:changed', refreshSelection);
  bus.on('segment-group:changed', refreshSelection);
  bus.on('drawing-set-focus:changed', refreshSelection);
  bus.on('smt:changed', refreshSelection);
  bus.on('order-review:changed', refreshSelection);
  bus.on('economic-calendar:changed', refreshSelection);
  bus.on('inspector:open-calendar-date', openCalendarDate);
  bus.on('order-setup-element:selected', () => {
    showActiveOrderSetupPanel();
  });
  bus.on('order-setup-element:selection-cleared', refreshSelection);
  bus.on('order-review-active:changed', ({ activeReviewSetId }) => {
    if (suppressActiveReviewRender) return;
    if (activeReviewSetId) {
      showActiveOrderSetupPanel();
      return;
    }
    refreshSelection();
  });
  bus.on('inspector:open-archive', () => {
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderArchivePanel();
    openSidebar();
  });
  bus.on('bars:cleared', () => {
    segmentActions.clearActorPickState({ silent: true });
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    calendarSelectedDate = '';
    calendarViewDate = '';
    renderEmpty();
  });
  bus.on('bars:loaded', () => {
    calendarSelectedDate = getDefaultCalendarDate();
    calendarViewDate = calendarSelectedDate;
    refreshSelection();
  });
}
