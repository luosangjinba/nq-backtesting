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
import { renderOrderReviewPanel } from './inspector/order-review-panel.js';
import { createOrderReviewActionController } from './inspector/order-review-actions.js';
import {
  canPopInspectorPage,
  popInspectorPage,
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
  getOrderReviews,
} from '../order/order-review-store.js';
import { recordHistory } from '../history/history-manager.js';

let sidebarEl = null;
let bodyEl = null;
let currentPanel = 'empty';
let expandedOrderReviewId = null;
let selectedSmtId = null;
let calendarSelectedDate = '';
let calendarViewDate = '';
let calendarReturnContext = null;

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
  renderEmpty,
});

const segmentActions = createSegmentInspectorActionController({
  getCurrentSegment,
  getCurrentSegmentGroup,
  getBodyEl: () => bodyEl,
  renderEmpty,
});

function getOrderReviewPanelOptions(extra = {}) {
  return {
    expandedOrderReviewId,
    activeOrderReviewId: getActiveReviewSetId(),
    selectedOrderSetupElement: getSelectedOrderSetupElement(),
    ...extra,
  };
}

function renderCalendarReturnAction(type, id) {
  if (
    !calendarReturnContext ||
    calendarReturnContext.type !== type ||
    String(calendarReturnContext.id) !== String(id)
  ) {
    return '';
  }
  return `
    <div class="inspector-return-bar">
      <button class="inspector-button secondary" data-inspector-action="calendar-return" type="button">
        Back to Calendar
      </button>
    </div>
  `;
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

function renderAnnotation(annotation) {
  currentPanel = 'selection';
  replaceInspectorPage({ kind: 'detail', objectType: 'pda', objectId: annotation.id });
  bodyEl.innerHTML = `
    ${renderCalendarReturnAction('pda', annotation.id)}
    ${renderInspectorBackAction()}
    ${renderAnnotationPanel(annotation, renderArchiveActions())}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions({
      createAction: 'order-review-create-empty',
      createLabel: 'Create Order Setup',
    }))}
  `;
}

function renderSegment(segment) {
  currentPanel = 'selection';
  replaceInspectorPage({ kind: 'detail', objectType: 'segment', objectId: segment.id });
  bodyEl.innerHTML = `
    ${renderCalendarReturnAction('segment', segment.id)}
    ${renderInspectorBackAction()}
    ${renderSegmentPanel(segment)}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions({
      createAction: 'order-review-create-segment',
      createLabel: 'Create Setup With Segment',
    }))}
  `;
}

function renderSegmentGroup(segmentGroup) {
  currentPanel = 'selection';
  replaceInspectorPage({ kind: 'detail', objectType: 'composite', objectId: segmentGroup.id });
  bodyEl.innerHTML = `
    ${renderCalendarReturnAction('composite', segmentGroup.id)}
    ${renderInspectorBackAction()}
    ${renderSegmentGroupPanel(segmentGroup)}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions({
      createAction: 'order-review-create-composite',
      createLabel: 'Create Setup With Composite',
    }))}
  `;
}

function renderSmtSelection() {
  currentPanel = 'selection';
  replaceInspectorPage({ kind: 'detail', objectType: 'smt', objectId: selectedSmtId });
  bodyEl.innerHTML = `
    ${renderCalendarReturnAction('smt', selectedSmtId)}
    ${renderInspectorBackAction()}
    ${renderSmtPanel(getSmtRecords(), { selectedSmtId })}
  `;
}

function renderEmpty({ preserveCalendarReturn = false } = {}) {
  currentPanel = 'empty';
  replaceInspectorPage({
    kind: 'home',
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  if (!preserveCalendarReturn) calendarReturnContext = null;
  if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
  if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
  bodyEl.innerHTML = `
    ${preserveCalendarReturn ? renderCalendarReturnAction('order-setup', getActiveReviewSetId()) : ''}
    <div class="inspector-empty">
      Select a PDA or 1H segment on the chart.
    </div>
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate })}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions({
      createAction: 'order-review-create-empty',
      createLabel: 'Create Order Setup',
    }))}
    ${renderArchiveActions()}
  `;
}

function renderArchivePanel() {
  currentPanel = 'archive';
  replaceInspectorPage({
    kind: 'archive',
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  calendarReturnContext = null;
  if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
  if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
  bodyEl.innerHTML = `
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate })}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions())}
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
  const section = bodyEl?.querySelector('[data-inspector-section="active-order-setup"]');
  section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function showActiveOrderSetupPanel() {
  syncCalendarToOrderReview(getActiveReviewSetId());
  renderEmpty();
  openSidebar();
  requestAnimationFrame(() => focusActiveOrderSetupPanel());
}

function refreshSelection() {
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
  calendarReturnContext = {
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
    type,
    id,
  };
  if (type === 'order-setup') {
    const selected = Boolean(setActiveReviewSet(id));
    if (!selected) {
      calendarReturnContext = null;
      return false;
    }
    if (selected) {
      calendarReturnContext = {
        selectedDate: calendarSelectedDate,
        viewDate: calendarViewDate,
        type,
        id,
      };
      clearPdaSelection();
      clearSegmentSelection();
      clearSegmentGroupSelection();
      renderEmpty({ preserveCalendarReturn: true });
    }
    return selected;
  }
  if (type === 'pda') {
    clearSegmentSelection();
    clearSegmentGroupSelection();
    const selected = Boolean(selectPda(id));
    if (!selected) calendarReturnContext = null;
    return selected;
  }
  if (type === 'segment') {
    const selected = Boolean(selectSegment(id));
    if (!selected) calendarReturnContext = null;
    return selected;
  }
  if (type === 'composite') {
    const selected = Boolean(selectSegmentGroup(id));
    if (!selected) calendarReturnContext = null;
    return selected;
  }
  if (type === 'smt') {
    const selected = Boolean(getSmtRecordById(id));
    if (!selected) {
      calendarReturnContext = null;
      return false;
    }
    selectedSmtId = id;
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderSmtSelection();
    return true;
  }
  calendarReturnContext = null;
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

  if (action === 'calendar-return') {
    const target = calendarReturnContext;
    calendarReturnContext = null;
    if (target?.selectedDate) calendarSelectedDate = target.selectedDate;
    if (target?.viewDate) calendarViewDate = target.viewDate;
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderEmpty();
    bus.emit('status:update', { text: 'Returned to Calendar', isError: false });
    return;
  }

  if (action === 'inspector-back') {
    const page = popInspectorPage();
    if (page.selectedDate) calendarSelectedDate = page.selectedDate;
    if (page.viewDate) calendarViewDate = page.viewDate;
    if (page.kind === 'archive') {
      renderArchivePanel();
    } else {
      clearPdaSelection();
      clearSegmentSelection();
      clearSegmentGroupSelection();
      renderEmpty();
    }
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
    recordInspectorHistory('Delete SMT', () => deleteSmtRecord(actionEl.dataset.smtId));
    if (selectedSmtId === actionEl.dataset.smtId) selectedSmtId = null;
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
  bus.on('order-setup-element:selected', () => {
    showActiveOrderSetupPanel();
  });
  bus.on('order-setup-element:selection-cleared', refreshSelection);
  bus.on('order-review-active:changed', ({ activeReviewSetId }) => {
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
