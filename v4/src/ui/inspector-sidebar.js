// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as comparisonChart from '../chart/comparison-chart-manager.js';
import * as store from '../data/bar-store.js';
import {
  didReplayPickJustHandleClick,
  getReplayVisibleBars,
  isReplayPicking,
} from './replay-controls.js';
import { isSmtPicking } from '../smt/manual-smt.js';
import { clearSelection as clearPdaSelection, getSelectedPda, selectPda } from '../pda/pda-selection.js';
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
import { renderDrawingSetList } from './inspector/drawing-set-panel.js';
import {
  canPopInspectorPage,
  getInspectorPage,
  popInspectorPage,
  pushInspectorPage,
  replaceInspectorPage,
  resetInspectorPage,
} from './inspector/page-stack.js';
import {
  captureInspectorOpenGroups,
  clickInspectorBodyAction,
  closeInspectorActionMenus as closeShellActionMenus,
  closeInspectorShell,
  createInspectorShell,
  focusInspectorBodySelector,
  getInspectorBodyElement,
  isInspectorShellOpen,
  openInspectorShell,
  setInspectorShellBody,
} from './inspector/inspector-shell.js';
import { initInspectorSelectionRouter } from './inspector/inspector-selection-router.js';
import { renderInspectorBackAction as renderBackAction } from './inspector/inspector-navigation.js';
import { createInspectorControllerRegistry } from './inspector/inspector-controller-registry.js';
import { createInspectorCalendarBackTarget } from './inspector/inspector-calendar-back-target.js';
import { createInspectorOpenObjectCoordinator } from './inspector/inspector-open-object-coordinator.js';
import {
  getDefaultCalendarDate,
  getNextCalendarViewDate,
  hydrateCalendarVisibilityControls,
} from './inspector/calendar-panel.js';
import {
  getAnnotationCalendarDate,
  getCompositeCalendarDate,
  getCompositeTimestamp,
  getLiveRecordCalendarDate,
  getOrderReviewCalendarDate,
  getSegmentCalendarDate,
  getSmtCalendarDate,
} from './inspector/calendar-object-date.js';
import { getReplayCalendarDate } from './inspector/calendar-day-context.js';
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
  getLiveRecordById,
} from '../live-record/live-record-store.js';
import {
  setActiveLiveRecord,
} from '../live-record/live-record-active.js';
import { getSelectedLiveRecordElement } from '../live-record/live-record-selection.js';
import {
  getDailyTimeReviewByDate,
  getOrCreateDailyTimeReview,
} from '../time-reaction/daily-time-review-store.js';
import { recordHistory } from '../history/history-manager.js';
import { getEconomicEventById } from '../economic-calendar/economic-calendar-store.js';
import { ENTRY_CONTEXT_CATALOG_CHANGED } from '../entry-context/entry-context-catalog-store.js';

let currentPanel = 'empty';
let expandedOrderReviewId = null;
let selectedSmtId = null;
let calendarSelectedDate = '';
let calendarViewDate = '';
let calendarOpenGroups = new Set();
let suppressActiveReviewRender = false;
let suppressSelectionBackTarget = false;
let lastReplayCalendarDate = '';

function getInspectorSidebarState() {
  return {
    currentPanel,
    selectedSmtId,
    calendarSelectedDate,
    calendarViewDate,
    calendarOpenGroups,
  };
}

function setCurrentPanel(nextPanel) {
  currentPanel = nextPanel;
}

function setSelectedSmtId(nextSmtId) {
  selectedSmtId = nextSmtId;
}

function setCalendarState(nextState = {}) {
  if (Object.hasOwn(nextState, 'selectedDate')) calendarSelectedDate = nextState.selectedDate;
  if (Object.hasOwn(nextState, 'viewDate')) calendarViewDate = nextState.viewDate;
  if (Array.isArray(nextState.openGroups)) calendarOpenGroups = new Set(nextState.openGroups);
}

function setCalendarDate(selectedDate, viewDate = selectedDate) {
  calendarSelectedDate = selectedDate;
  calendarViewDate = viewDate;
}

function renderInspectorBackAction() {
  return renderBackAction(canPopInspectorPage());
}

const {
  syncCalendarToOrderReview,
  prepareDetailBackTarget,
  prepareSelectionBackTarget,
} = createInspectorCalendarBackTarget({
  getCalendarSelectedDate: () => calendarSelectedDate,
  getCalendarViewDate: () => calendarViewDate,
  getCalendarOpenGroups: () => calendarOpenGroups,
  setCalendarDateContext,
  setCalendarDate,
  captureCalendarOpenGroups,
  getInspectorPage,
  resetInspectorPage,
  pushInspectorPage,
  getOrderReviewById,
  getOrderReviewCalendarDate,
});

const { openCalendarObject } = createInspectorOpenObjectCoordinator({
  getCalendarSelectedDate: () => calendarSelectedDate,
  getCalendarViewDate: () => calendarViewDate,
  setCalendarDateContext,
  setSelectedSmtId,
  setSuppressActiveReviewRender: (value) => {
    suppressActiveReviewRender = Boolean(value);
  },
  setSuppressSelectionBackTarget: (value) => {
    suppressSelectionBackTarget = Boolean(value);
  },
  syncCalendarToOrderReview,
  pushInspectorPage,
  clearPdaSelection,
  clearSegmentSelection,
  clearSegmentGroupSelection,
  selectPda,
  selectSegment,
  selectSegmentGroup,
  setActiveReviewSet,
  setActiveLiveRecord,
  getAnnotationById,
  getSegmentById,
  getSegmentGroupById,
  getSmtRecordById,
  getLiveRecordById,
  getEconomicEventById,
  renderOrderSetupDetail,
  renderLiveRecordDetail,
  renderSmtSelection,
  renderDailyTimeReviewDetail,
  renderEconomicEventDetail,
});

const {
  orderReviewActions,
  pdaActions,
  segmentActions,
  dailyTimeActions,
  chartNoteActions,
  economicEventActions,
  liveRecordActions,
  calendarActions,
  drawingSetActions,
  entryContextCatalogActions,
  smtActions,
  archiveActions,
  changeRouter,
  actionRouter,
  pageRouter,
  calendarSync,
} = createInspectorControllerRegistry({
  bus,
  store,
  getExpandedOrderReviewId: () => expandedOrderReviewId,
  setExpandedOrderReviewId: (orderReviewId) => {
    expandedOrderReviewId = orderReviewId;
  },
  getSelectedSmtId: () => selectedSmtId,
  setSelectedSmtId,
  getCurrentPanel: () => currentPanel,
  getCompositeTimestamp,
  syncCalendarToOrderReview,
  refreshSelection,
  getCurrentAnnotation,
  getCurrentSegment,
  getCurrentSegmentGroup,
  getInspectorBodyElement,
  renderAfterDetailDeleted,
  renderDailyTimeReviewDetail,
  openSidebar,
  setCalendarDateContext,
  recordInspectorHistory,
  captureCalendarOpenGroups,
  renderEntryContextCatalogMaintenance,
  getInspectorPage,
  prepareDetailBackTarget,
  renderSmtSelection,
  renderArchivePanel,
  clickInspectorBodyAction,
  confirmSync: () => (
    globalThis.window?.confirm
      ? globalThis.window.confirm('Export Review JSON or PDA JSON before syncing PDA annotations to the server. Continue?')
      : true
  ),
  closeInspectorActionMenus,
  renderPageFromState,
  popInspectorPage,
  emitStatus: (payload) => bus.emit('status:update', payload),
  pushInspectorPage,
  getCalendarSelectedDate: () => calendarSelectedDate,
  getCalendarViewDate: () => calendarViewDate,
  getCalendarOpenGroups: () => calendarOpenGroups,
  getNextCalendarViewDate,
  getDefaultCalendarDate,
  setCalendarViewDate: (viewDate) => {
    calendarViewDate = viewDate;
  },
  getInspectorSidebarState,
  setCalendarState,
  setCurrentPanel,
  setCalendarDate,
  getOrderReviewPanelOptions,
  renderInspectorBackAction,
  setInspectorBody,
  replaceInspectorPage,
  getAnnotationById,
  getSegmentById,
  getSegmentGroupById,
  getSmtRecordById,
  getSmtRecords,
  getOrderReviewById,
  getLiveRecordById,
  getDailyTimeReviewByDate,
  getOrCreateDailyTimeReview,
  getEconomicEventById,
  clearPdaSelection,
  clearSegmentSelection,
  clearSegmentGroupSelection,
  getReplayVisibleBars,
  updateTimeOverlaySettings,
  isInspectorShellOpen,
  isCalendarClickFollowBlocked,
  resetInspectorPage,
  renderEmpty,
  openCalendarObject,
});

function renderAnnotation(annotation) {
  return pageRouter.renderAnnotation(annotation);
}

function renderSegment(segment) {
  return pageRouter.renderSegment(segment);
}

function renderSegmentGroup(segmentGroup) {
  return pageRouter.renderSegmentGroup(segmentGroup);
}

function renderSmtSelection() {
  return pageRouter.renderSmtSelection();
}

function renderOrderSetupDetail(orderReviewId) {
  return pageRouter.renderOrderSetupDetail(orderReviewId);
}

function renderLiveRecordDetail(liveRecordId) {
  return pageRouter.renderLiveRecordDetail(liveRecordId);
}

function renderDailyTimeReviewDetail(dateKey, sectionKey = '') {
  return pageRouter.renderDailyTimeReviewDetail(dateKey, sectionKey);
}

function renderEconomicEventDetail(eventId) {
  return pageRouter.renderEconomicEventDetail(eventId);
}

function renderEntryContextCatalogMaintenance() {
  return pageRouter.renderEntryContextCatalogMaintenance();
}

function renderEmpty() {
  return pageRouter.renderEmpty();
}

function renderArchivePanel() {
  return pageRouter.renderArchivePanel();
}

function renderPageFromState(page = getInspectorPage()) {
  restoreCalendarStateFromPage(page);
  return pageRouter.renderPageFromState(page);
}

function renderAfterDetailDeleted() {
  return pageRouter.renderAfterDetailDeleted();
}

function setCalendarDateContext(dateKey) {
  return calendarSync.setCalendarDateContext(dateKey);
}

function openCalendarDate(payload = {}) {
  return calendarSync.openCalendarDate(payload);
}

function handlePrimaryCalendarClick(param = {}) {
  return calendarSync.handlePrimaryCalendarClick(param);
}

function restoreCalendarStateFromPage(page = {}) {
  if (page.selectedDate) calendarSelectedDate = page.selectedDate;
  if (page.viewDate) calendarViewDate = page.viewDate;
  if (Array.isArray(page.openGroups)) calendarOpenGroups = new Set(page.openGroups);
}

function getOrderReviewPanelOptions(extra = {}) {
  return {
    expandedOrderReviewId,
    activeOrderReviewId: getActiveReviewSetId(),
    selectedOrderSetupElement: getSelectedOrderSetupElement(),
    pendingReasonRefPick: orderReviewActions.getPendingReasonRefPick(),
    ...extra,
  };
}

function isCalendarClickFollowBlocked() {
  return Boolean(
    isReplayPicking() ||
      didReplayPickJustHandleClick() ||
      isSmtPicking() ||
      orderReviewActions.isExitPicking?.() ||
      orderReviewActions.didExitPickJustHandleClick?.() ||
      orderReviewActions.isReasonRefPicking?.() ||
      dailyTimeActions.isPicking?.() ||
      segmentActions.isActorPicking?.() ||
      segmentActions.didActorPickJustHandleClick?.()
  );
}

function openSidebar() {
  openInspectorShell();
}

function closeSidebar() {
  closeInspectorShell();
}

function focusActiveOrderSetupPanel() {
  focusInspectorBodySelector('[data-inspector-section="order-setup-detail"]');
}

function showActiveOrderSetupPanel() {
  const dateSynced = syncCalendarToOrderReview(getActiveReviewSetId());
  if (dateSynced) prepareDetailBackTarget(calendarSelectedDate);
  renderOrderSetupDetail(getActiveReviewSetId());
  openSidebar();
  requestAnimationFrame(() => focusActiveOrderSetupPanel());
}

function showSelectedLiveRecordPanel() {
  const liveRecordId = getSelectedLiveRecordElement()?.liveRecordId;
  const record = liveRecordId ? getLiveRecordById(liveRecordId) : null;
  if (!liveRecordId || !record) {
    refreshSelection();
    return;
  }
  prepareDetailBackTarget(getLiveRecordCalendarDate(record));
  renderLiveRecordDetail(liveRecordId);
  openSidebar();
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

function isEditingDailyTimeTextField() {
  const action = document.activeElement?.dataset?.inspectorAction || '';
  return [
    'daily-time-bias-field',
    'daily-time-opening-thesis-field',
  ].includes(action);
}

function refreshSelectionUnlessEditingDailyTimeText() {
  if (isEditingDailyTimeTextField()) return;
  refreshSelection();
}

function refreshOnEntryContextCatalogChange() {
  const page = getInspectorPage();
  if (page.kind === 'entry-context-catalog') {
    renderEntryContextCatalogMaintenance();
    return;
  }
  if (
    page.kind === 'detail' &&
    (page.objectType === 'order-setup' || page.objectType === 'live-record')
  ) {
    renderPageFromState(page);
  }
}

function refreshOnReplayDayChange({ enabled } = {}) {
  const replayDate = enabled ? getReplayCalendarDate() : '';
  if (replayDate === lastReplayCalendarDate) return;
  if (replayDate && (!calendarSelectedDate || calendarSelectedDate === lastReplayCalendarDate)) {
    calendarSelectedDate = replayDate;
    calendarViewDate = replayDate;
  }
  lastReplayCalendarDate = replayDate;
  refreshSelection();
}

function createSidebar() {
  createInspectorShell({
    onClose: closeSidebar,
    onChange: changeRouter.handleChange,
    onClick: actionRouter.handleClick,
    onFocusOut: handleInspectorFocusOut,
  });
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

function hydrateInspector() {
  const bodyEl = getInspectorBodyElement();
  if (!bodyEl) return;
  hydrateCalendarVisibilityControls(bodyEl);
}

function setInspectorBody(html) {
  setInspectorShellBody(html, hydrateCalendarVisibilityControls);
}

function captureCalendarOpenGroups() {
  calendarOpenGroups = captureInspectorOpenGroups();
}

function closeInspectorActionMenus(exceptMenu = null) {
  closeShellActionMenus(exceptMenu);
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
  chart.onClick(handlePrimaryCalendarClick);
  comparisonChart.onComparisonCrosshairMove(orderReviewActions.handleComparisonExitPickHover);
  comparisonChart.onComparisonCrosshairMove(segmentActions.handleComparisonActorPickHover);
  bindComparisonPickClickHandlers();
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      orderReviewActions.clearExitPickState();
      orderReviewActions.clearReasonRefPick?.({ silent: true });
      liveRecordActions.clearRefPick?.({ silent: true });
      segmentActions.clearActorPickState();
      dailyTimeActions.clearRefPick({ silent: true });
    }
  });
  initInspectorSelectionRouter({
    dailyTimeActions,
    orderReviewActions,
    liveRecordActions,
    segmentActions,
    clearPdaSelection,
    clearSegmentSelection,
    clearSegmentGroupSelection,
    getSelectedOrderSetupElement,
    getOrderReviewById,
    getDefaultCalendarDate,
    getSuppressSelectionBackTarget: () => suppressSelectionBackTarget,
    getSuppressActiveReviewRender: () => suppressActiveReviewRender,
    prepareSelectionBackTarget,
    renderAnnotation,
    renderSegment,
    renderSegmentGroup,
    renderSmtSelection,
    renderArchivePanel,
    renderEmpty,
    renderSelectedLiveRecordPanel: showSelectedLiveRecordPanel,
    showActiveOrderSetupPanel,
    openSidebar,
    refreshSelection,
    refreshOnEntryContextCatalogChange,
    refreshSelectionUnlessEditingDailyTimeText,
    refreshOnReplayDayChange,
    openCalendarDate,
    setSelectedSmtId: (smtId) => {
      selectedSmtId = smtId;
    },
    setCalendarDate: (selectedDate, viewDate = selectedDate) => {
      calendarSelectedDate = selectedDate;
      calendarViewDate = viewDate;
    },
    clearCalendarDate: () => {
      calendarSelectedDate = '';
      calendarViewDate = '';
    },
    getAnnotationCalendarDate,
    getSegmentCalendarDate,
    getCompositeCalendarDate,
    getSmtCalendarDate,
    entryContextCatalogChangedEvent: ENTRY_CONTEXT_CATALOG_CHANGED,
  });
}

let comparisonPickClickBound = false;

function bindComparisonPickClickHandlers() {
  if (comparisonPickClickBound) return;
  const chartEl = document.getElementById('comparison-chart-canvas');
  if (!chartEl) {
    requestAnimationFrame(bindComparisonPickClickHandlers);
    return;
  }
  chartEl.addEventListener('click', orderReviewActions.handleExitPickChartClick, true);
  chartEl.addEventListener('click', segmentActions.handleActorPickChartClick, true);
  comparisonPickClickBound = true;
}
