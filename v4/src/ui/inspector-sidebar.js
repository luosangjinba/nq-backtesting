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
import { createDrawingSetActionController, renderDrawingSetList } from './inspector/drawing-set-panel.js';
import { createEntryContextCatalogActionController } from './inspector/entry-context-catalog-actions.js';
import { createSmtInspectorActionController } from './inspector/smt-actions.js';
import { createLiveRecordActionController } from './inspector/live-record-actions.js';
import { createOrderReviewActionController } from './inspector/order-review-actions.js';
import { createDailyTimeInspectorActionController } from './inspector/time-reaction-actions.js';
import { createChartNoteInspectorActionController } from './inspector/chart-note-actions.js';
import { createEconomicEventActionController } from './inspector/economic-event-actions.js';
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
import { createInspectorArchiveActionController } from './inspector/inspector-archive-actions.js';
import { createInspectorChangeRouter } from './inspector/inspector-change-router.js';
import { createInspectorActionRouter } from './inspector/inspector-action-router.js';
import { renderInspectorBackAction as renderBackAction } from './inspector/inspector-navigation.js';
import { INSPECTOR_DETAIL_TYPES } from './inspector/inspector-panel-registry.js';
import { createInspectorPageRouter } from './inspector/inspector-page-router.js';
import { createInspectorCalendarSync } from './inspector/inspector-calendar-sync.js';
import { createPdaInspectorActionController } from './inspector/pda-actions.js';
import { createSegmentInspectorActionController } from './inspector/segment-actions.js';
import {
  getDefaultCalendarDate,
  getNextCalendarViewDate,
  hydrateCalendarVisibilityControls,
} from './inspector/calendar-panel.js';
import { createCalendarActionController } from './inspector/calendar-actions.js';
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

function renderInspectorBackAction() {
  return renderBackAction(canPopInspectorPage());
}

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
  getBodyEl: getInspectorBodyElement,
  renderEmpty: renderAfterDetailDeleted,
});

const dailyTimeActions = createDailyTimeInspectorActionController({
  renderDailyTimeReviewDetail,
  refreshSelection,
  openSidebar,
  setCalendarDateContext,
  recordInspectorHistory,
});
const chartNoteActions = createChartNoteInspectorActionController({
  handlePickedOrderReasonChartNote: (note) => orderReviewActions.handlePickedChartNote(note),
  isOrderReasonPicking: () => orderReviewActions.isReasonRefPicking(),
  recordInspectorHistory,
});

const economicEventActions = createEconomicEventActionController({
  recordInspectorHistory,
});

const liveRecordActions = createLiveRecordActionController({
  getSelectedSmtId: () => selectedSmtId,
  refreshSelection,
  captureCalendarOpenGroups,
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

const entryContextCatalogActions = createEntryContextCatalogActionController({
  renderCatalogPanel: renderEntryContextCatalogMaintenance,
  recordInspectorHistory,
});

const smtActions = createSmtInspectorActionController({
  getSelectedSmtId: () => selectedSmtId,
  setSelectedSmtId: (smtId) => {
    selectedSmtId = smtId;
  },
  getInspectorPage,
  getCurrentPanel: () => currentPanel,
  dailyTimeActions,
  orderReviewActions,
  prepareDetailBackTarget,
  renderSmtSelection,
  renderAfterDetailDeleted,
  renderArchivePanel,
  openSidebar,
  recordInspectorHistory,
});

const archiveActions = createInspectorArchiveActionController({
  clickInspectorBodyAction,
  confirmSync: () => (
    globalThis.window?.confirm
      ? globalThis.window.confirm('Export Review JSON or PDA JSON before syncing PDA annotations to the server. Continue?')
      : true
  ),
});

const changeRouter = createInspectorChangeRouter({
  archiveActions,
  smtActions,
  dailyTimeActions,
  chartNoteActions,
  economicEventActions,
  liveRecordActions,
  entryContextCatalogActions,
  orderReviewActions,
  segmentActions,
  pdaActions,
});

const actionRouter = createInspectorActionRouter({
  closeInspectorActionMenus,
  calendarActions,
  renderPageFromState,
  popInspectorPage,
  emitStatus: (payload) => bus.emit('status:update', payload),
  captureCalendarOpenGroups,
  pushInspectorPage,
  getCalendarSelectedDate: () => calendarSelectedDate,
  getCalendarViewDate: () => calendarViewDate,
  getCalendarOpenGroups: () => calendarOpenGroups,
  renderEntryContextCatalogMaintenance,
  dailyTimeActions,
  chartNoteActions,
  getNextCalendarViewDate,
  getDefaultCalendarDate,
  setCalendarViewDate: (viewDate) => {
    calendarViewDate = viewDate;
  },
  refreshSelection,
  archiveActions,
  smtActions,
  liveRecordActions,
  entryContextCatalogActions,
  orderReviewActions,
  drawingSetActions,
  segmentActions,
  pdaActions,
  getCurrentSegment,
  getCurrentSegmentGroup,
  getCurrentAnnotation,
});

const pageRouter = createInspectorPageRouter({
  getState: getInspectorSidebarState,
  setCalendarState,
  setCurrentPanel,
  setSelectedSmtId,
  setCalendarDateContext,
  getDefaultCalendarDate,
  getOrderReviewPanelOptions,
  renderInspectorBackAction,
  setInspectorBody,
  replaceInspectorPage,
  popInspectorPage,
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
  dailyTimeActions,
  orderReviewActions,
  liveRecordActions,
  clearPdaSelection,
  clearSegmentSelection,
  clearSegmentGroupSelection,
});

const calendarSync = createInspectorCalendarSync({
  bus,
  store,
  getReplayVisibleBars,
  updateTimeOverlaySettings,
  getInspectorPage,
  getCurrentPanel: () => currentPanel,
  getCalendarState: getInspectorSidebarState,
  setCalendarState,
  captureCalendarOpenGroups,
  refreshSelection,
  isInspectorShellOpen,
  isCalendarClickFollowBlocked,
  clearPdaSelection,
  clearSegmentSelection,
  clearSegmentGroupSelection,
  clearSelectedSmt: () => {
    selectedSmtId = null;
  },
  resetInspectorPage,
  renderEmpty,
  openSidebar,
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

function syncCalendarToOrderReview(orderReviewId) {
  const order = getOrderReviewById(orderReviewId);
  const dateKey = getOrderReviewCalendarDate(order);
  if (!dateKey) return false;
  calendarSelectedDate = dateKey;
  calendarViewDate = dateKey;
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
      ...page,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
      openGroups: Array.from(calendarOpenGroups),
    });
    return true;
  }
  return prepareDetailBackTarget(dateKey);
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
      objectType: INSPECTOR_DETAIL_TYPES.ORDER_SETUP,
        objectId: id,
        selectedDate: calendarSelectedDate,
        viewDate: calendarViewDate,
      });
      renderOrderSetupDetail(id);
    }
    return selected;
  }
  if (type === 'live-record') {
    if (!getLiveRecordById(id)) return false;
    setActiveLiveRecord(id);
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    pushInspectorPage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.LIVE_RECORD,
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    renderLiveRecordDetail(id);
    return true;
  }
  if (type === 'pda') {
    if (!getAnnotationById(id)) return false;
    clearSegmentSelection();
    clearSegmentGroupSelection();
    pushInspectorPage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.PDA,
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
      objectType: INSPECTOR_DETAIL_TYPES.SEGMENT,
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
      objectType: INSPECTOR_DETAIL_TYPES.COMPOSITE,
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
      objectType: INSPECTOR_DETAIL_TYPES.SMT,
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
      objectType: INSPECTOR_DETAIL_TYPES.TIME_REACTION,
      objectId: id,
      sectionKey: options.sectionKey || '',
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    renderDailyTimeReviewDetail(id, options.sectionKey || '');
    return true;
  }
  if (type === 'economic-event') {
    if (!getEconomicEventById(id)) return false;
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    selectedSmtId = null;
    pushInspectorPage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.ECONOMIC_EVENT,
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    renderEconomicEventDetail(id);
    return true;
  }
  return false;
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
