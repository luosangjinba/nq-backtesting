// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
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
import { renderArchiveActions } from './inspector/archive-panel.js';
import { createDrawingSetActionController, renderDrawingSetList } from './inspector/drawing-set-panel.js';
import { renderAnnotationPanel } from './inspector/pda-panel.js';
import { renderSegmentPanel } from './inspector/segment-panel.js';
import { renderSegmentGroupPanel } from './inspector/segment-group-panel.js';
import { renderSmtPanel } from './inspector/smt-panel.js';
import { createSmtInspectorActionController } from './inspector/smt-actions.js';
import { renderOrderReviewDetailPanel } from './inspector/order-review-panel.js';
import {
  renderDailyTimeReviewPanel,
  renderDailyTimeReviewSectionPanel,
} from './inspector/time-reaction-panel.js';
import { createOrderReviewActionController } from './inspector/order-review-actions.js';
import { createDailyTimeInspectorActionController } from './inspector/time-reaction-actions.js';
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
  getNextCalendarViewDate,
  renderCalendarPanel,
} from './inspector/calendar-panel.js';
import { createCalendarActionController } from './inspector/calendar-actions.js';
import {
  dateKeyFromTimestamp,
  getAnnotationCalendarDate,
  getCompositeCalendarDate,
  getCompositeTimestamp,
  getOrderReviewCalendarDate,
  getSegmentCalendarDate,
} from './inspector/calendar-object-date.js';
import { updateTimeOverlaySettings } from '../time-overlays/time-overlay-store.js';
import { getSmtRecordById, getSmtRecords } from '../smt/smt-store.js';
import {
  getActiveReviewSetId,
  setActiveReviewSet,
} from '../order/order-review-active.js';
import { getSelectedOrderSetupElement } from '../order/order-setup-selection.js';
import {
  getOrderReviewById,
} from '../order/order-review-store.js';
import {
  getDailyTimeReviewByDate,
  getOrCreateDailyTimeReview,
} from '../time-reaction/daily-time-review-store.js';
import { recordHistory } from '../history/history-manager.js';

let sidebarEl = null;
let bodyEl = null;
let currentPanel = 'empty';
let expandedOrderReviewId = null;
let selectedSmtId = null;
let calendarSelectedDate = '';
let calendarViewDate = '';
let calendarOpenGroups = new Set();
let suppressActiveReviewRender = false;
let suppressSelectionBackTarget = false;

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

const dailyTimeActions = createDailyTimeInspectorActionController({
  renderDailyTimeReviewDetail,
  refreshSelection,
  openSidebar,
  setCalendarDateContext,
  recordInspectorHistory,
});

const calendarActions = createCalendarActionController({
  getSelectedDate: () => calendarSelectedDate,
  setSelectedDate: (selectedDate, viewDate = selectedDate) => {
    calendarSelectedDate = selectedDate;
    calendarViewDate = viewDate;
  },
  refreshSelection,
  captureCalendarOpenGroups,
  recordInspectorHistory,
  openCalendarObject,
});

const drawingSetActions = createDrawingSetActionController();

const smtActions = createSmtInspectorActionController({
  getSelectedSmtId: () => selectedSmtId,
  setSelectedSmtId: (smtId) => {
    selectedSmtId = smtId;
  },
  getInspectorPage,
  getCurrentPanel: () => currentPanel,
  dailyTimeActions,
  prepareDetailBackTarget,
  renderSmtSelection,
  renderAfterDetailDeleted,
  renderArchivePanel,
  openSidebar,
  recordInspectorHistory,
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

function syncCalendarToOrderReview(orderReviewId) {
  const order = getOrderReviewById(orderReviewId);
  const dateKey = getOrderReviewCalendarDate(order);
  if (!dateKey) return false;
  calendarSelectedDate = dateKey;
  calendarViewDate = dateKey;
  return true;
}

function setCalendarDateContext(dateKey) {
  if (!dateKey) return false;
  calendarSelectedDate = dateKey;
  calendarViewDate = dateKey;
  updateTimeOverlaySettings({ selectedDate: dateKey });
  return true;
}

function prepareDetailBackTarget(dateKey) {
  if (!setCalendarDateContext(dateKey)) return false;
  captureCalendarOpenGroups();
  resetInspectorPage({
    kind: 'home',
    selectedDate: dateKey,
    viewDate: dateKey,
    openGroups: Array.from(calendarOpenGroups),
  });
  pushInspectorPage({ kind: 'detail', selectedDate: dateKey, viewDate: dateKey });
  return true;
}

function prepareSelectionBackTarget(dateKey) {
  const page = getInspectorPage();
  if (page.kind === 'detail' && page.objectType && page.objectId) {
    pushInspectorPage({
      kind: 'detail',
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    return true;
  }
  return prepareDetailBackTarget(dateKey);
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
  setCalendarDateContext(dateKey);
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

function renderDailyTimeReviewDetail(dateKey, sectionKey = '') {
  const review = getDailyTimeReviewByDate(dateKey) || getOrCreateDailyTimeReview(dateKey);
  currentPanel = 'detail';
  setCalendarDateContext(dateKey);
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'time-reaction',
    objectId: dateKey,
    sectionKey,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${
      sectionKey
        ? renderDailyTimeReviewSectionPanel(review, sectionKey, { pendingRefPick: dailyTimeActions.getPendingRefPick() })
        : renderDailyTimeReviewPanel(review, { pendingRefPick: dailyTimeActions.getPendingRefPick() })
    }
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
    openGroups: Array.from(calendarOpenGroups),
  });
  bodyEl.innerHTML = `
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate, openGroups: calendarOpenGroups })}
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
    openGroups: Array.from(calendarOpenGroups),
  });
  bodyEl.innerHTML = `
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate, openGroups: calendarOpenGroups })}
    ${renderArchiveActions()}
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
  const dateSynced = syncCalendarToOrderReview(getActiveReviewSetId());
  if (dateSynced) prepareDetailBackTarget(calendarSelectedDate);
  renderOrderSetupDetail(getActiveReviewSetId());
  openSidebar();
  requestAnimationFrame(() => focusActiveOrderSetupPanel());
}

function restoreCalendarStateFromPage(page = {}) {
  if (page.selectedDate) calendarSelectedDate = page.selectedDate;
  if (page.viewDate) calendarViewDate = page.viewDate;
  if (Array.isArray(page.openGroups)) calendarOpenGroups = new Set(page.openGroups);
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
    } else if (page.objectType === 'time-reaction') {
      if (String(page.objectId || '').match(/^\d{4}-\d{2}-\d{2}$/)) {
        renderDailyTimeReviewDetail(page.objectId, page.sectionKey || '');
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
  sidebarEl.addEventListener('focusout', handleInspectorFocusOut);
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

function captureCalendarOpenGroups() {
  if (!bodyEl) return;
  calendarOpenGroups = new Set(
    Array.from(bodyEl.querySelectorAll('.calendar-object-group[open][data-calendar-group-type]'))
      .map((groupEl) => groupEl.dataset.calendarGroupType)
      .filter(Boolean)
  );
}

function closeInspectorActionMenus(exceptMenu = null) {
  bodyEl?.querySelectorAll('.order-review-ref-menu[open], .calendar-object-menu[open]').forEach((menu) => {
    if (menu !== exceptMenu) menu.removeAttribute('open');
  });
}

function openCalendarObject(type, id, options = {}) {
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
    suppressSelectionBackTarget = true;
    try {
      return Boolean(selectPda(id));
    } finally {
      suppressSelectionBackTarget = false;
    }
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
    suppressSelectionBackTarget = true;
    try {
      return Boolean(selectSegment(id));
    } finally {
      suppressSelectionBackTarget = false;
    }
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
    suppressSelectionBackTarget = true;
    try {
      return Boolean(selectSegmentGroup(id));
    } finally {
      suppressSelectionBackTarget = false;
    }
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
  if (type === 'time-reaction') {
    if (!String(id || '').match(/^\d{4}-\d{2}-\d{2}$/)) return false;
    setCalendarDateContext(id);
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    selectedSmtId = null;
    pushInspectorPage({
      kind: 'detail',
      objectType: 'time-reaction',
      objectId: id,
      sectionKey: options.sectionKey || '',
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    renderDailyTimeReviewDetail(id, options.sectionKey || '');
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

  if (smtActions.handleChange(action, e.target)) {
    return;
  }

  if (dailyTimeActions.handleChange(action, e.target)) {
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
  const actionMenu = e.target.closest('.order-review-ref-menu, .calendar-object-menu');
  const actionEl = e.target.closest('[data-inspector-action]');
  const isMenuAction = Boolean(actionEl?.closest('.order-review-ref-menu-panel, .calendar-object-menu-panel'));
  closeInspectorActionMenus(isMenuAction ? null : actionMenu);

  const action = actionEl?.dataset.inspectorAction;
  if (!action) return;

  if (calendarActions.handleClick(action, actionEl)) {
    return;
  }

  if (action === 'inspector-back') {
    renderPageFromState(popInspectorPage());
    bus.emit('status:update', { text: 'Returned', isError: false });
    return;
  }

  if (dailyTimeActions.handleClick(action, actionEl)) {
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

  if (smtActions.handleClick(action, actionEl)) {
    return;
  }

  if (orderReviewActions.handleOrderReviewClick(action, actionEl)) {
    return;
  }

  if (drawingSetActions.handleClick(action, actionEl)) {
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

function handleInspectorFocusOut(e) {
  const actionMenu = e.target.closest('.order-review-ref-menu, .calendar-object-menu');
  if (!actionMenu) return;
  requestAnimationFrame(() => {
    if (!actionMenu.contains(document.activeElement)) actionMenu.removeAttribute('open');
  });
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
      dailyTimeActions.clearRefPick({ silent: true });
    }
  });
  bus.on('pda:selected', ({ annotation }) => {
    if (dailyTimeActions.isPicking()) {
      dailyTimeActions.handlePickedPda(annotation);
      return;
    }
    if (!suppressSelectionBackTarget) prepareSelectionBackTarget(getAnnotationCalendarDate(annotation));
    renderAnnotation(annotation);
    openSidebar();
  });
  bus.on('pda:selection-cleared', refreshSelection);
  bus.on('pda:changed', refreshSelection);
  bus.on('segment:selected', ({ segment }) => {
    if (dailyTimeActions.isPicking()) {
      dailyTimeActions.handlePickedSegment(segment);
      return;
    }
    if (!suppressSelectionBackTarget) prepareSelectionBackTarget(getSegmentCalendarDate(segment));
    renderSegment(segment);
    openSidebar();
  });
  bus.on('segment-group:selected', ({ segmentGroup }) => {
    if (dailyTimeActions.isPicking()) {
      dailyTimeActions.handlePickedComposite(segmentGroup);
      return;
    }
    if (!suppressSelectionBackTarget) prepareSelectionBackTarget(getCompositeCalendarDate(segmentGroup));
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
  bus.on('daily-time-review:changed', refreshSelection);
  bus.on('economic-calendar:changed', refreshSelection);
  bus.on('inspector:open-calendar-date', openCalendarDate);
  bus.on('order-setup-element:selected', () => {
    if (dailyTimeActions.isPicking()) {
      const order = getOrderReviewById(getSelectedOrderSetupElement()?.setupId);
      if (order) dailyTimeActions.handlePickedOrderSetup(order);
      return;
    }
    showActiveOrderSetupPanel();
  });
  bus.on('order-setup-element:selection-cleared', refreshSelection);
  bus.on('order-review-active:changed', ({ activeReviewSetId }) => {
    if (suppressActiveReviewRender) return;
    if (dailyTimeActions.isPicking() && activeReviewSetId) {
      const order = getOrderReviewById(activeReviewSetId);
      if (order) dailyTimeActions.handlePickedOrderSetup(order);
      return;
    }
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
