import { createDrawingSetActionController } from './drawing-set-panel.js';
import { createEntryContextCatalogActionController } from './entry-context-catalog-actions.js';
import { createSmtInspectorActionController } from './smt-actions.js';
import { createLiveRecordActionController } from './live-record-actions.js';
import { createOrderReviewActionController } from './order-review-actions.js';
import { createDailyTimeInspectorActionController } from './time-reaction-actions.js';
import { createChartNoteInspectorActionController } from './chart-note-actions.js';
import { createEconomicEventActionController } from './economic-event-actions.js';
import { createInspectorArchiveActionController } from './inspector-archive-actions.js';
import { createInspectorChangeRouter } from './inspector-change-router.js';
import { createInspectorActionRouter } from './inspector-action-router.js';
import { createInspectorPageRouter } from './inspector-page-router.js';
import { createInspectorCalendarSync } from './inspector-calendar-sync.js';
import { createPdaInspectorActionController } from './pda-actions.js';
import { createSegmentInspectorActionController } from './segment-actions.js';
import { createCalendarActionController } from './calendar-actions.js';

export function createInspectorControllerRegistry(deps) {
  const orderReviewActions = createOrderReviewActionController({
    getExpandedOrderReviewId: deps.getExpandedOrderReviewId,
    setExpandedOrderReviewId: deps.setExpandedOrderReviewId,
    getSelectedSmtId: deps.getSelectedSmtId,
    getCompositeTimestamp: deps.getCompositeTimestamp,
    syncCalendarToOrderReview: deps.syncCalendarToOrderReview,
    refreshSelection: deps.refreshSelection,
  });

  const pdaActions = createPdaInspectorActionController({
    getCurrentAnnotation: deps.getCurrentAnnotation,
    renderEmpty: deps.renderAfterDetailDeleted,
  });

  const segmentActions = createSegmentInspectorActionController({
    getCurrentSegment: deps.getCurrentSegment,
    getCurrentSegmentGroup: deps.getCurrentSegmentGroup,
    getBodyEl: deps.getInspectorBodyElement,
    renderEmpty: deps.renderAfterDetailDeleted,
  });

  const dailyTimeActions = createDailyTimeInspectorActionController({
    renderDailyTimeReviewDetail: deps.renderDailyTimeReviewDetail,
    refreshSelection: deps.refreshSelection,
    openSidebar: deps.openSidebar,
    setCalendarDateContext: deps.setCalendarDateContext,
    recordInspectorHistory: deps.recordInspectorHistory,
  });

  const chartNoteActions = createChartNoteInspectorActionController({
    handlePickedOrderReasonChartNote: (note) => orderReviewActions.handlePickedChartNote(note),
    isOrderReasonPicking: () => orderReviewActions.isReasonRefPicking(),
    recordInspectorHistory: deps.recordInspectorHistory,
  });

  const economicEventActions = createEconomicEventActionController({
    recordInspectorHistory: deps.recordInspectorHistory,
  });

  const liveRecordActions = createLiveRecordActionController({
    getSelectedSmtId: deps.getSelectedSmtId,
    refreshSelection: deps.refreshSelection,
    captureCalendarOpenGroups: deps.captureCalendarOpenGroups,
    recordInspectorHistory: deps.recordInspectorHistory,
  });

  const calendarActions = createCalendarActionController({
    getSelectedDate: deps.getCalendarSelectedDate,
    setSelectedDate: deps.setCalendarDate,
    refreshSelection: deps.refreshSelection,
    captureCalendarOpenGroups: deps.captureCalendarOpenGroups,
    recordInspectorHistory: deps.recordInspectorHistory,
    openCalendarObject: deps.openCalendarObject,
  });

  const drawingSetActions = createDrawingSetActionController();

  const entryContextCatalogActions = createEntryContextCatalogActionController({
    renderCatalogPanel: deps.renderEntryContextCatalogMaintenance,
    recordInspectorHistory: deps.recordInspectorHistory,
  });

  const smtActions = createSmtInspectorActionController({
    getSelectedSmtId: deps.getSelectedSmtId,
    setSelectedSmtId: deps.setSelectedSmtId,
    getInspectorPage: deps.getInspectorPage,
    getCurrentPanel: deps.getCurrentPanel,
    dailyTimeActions,
    orderReviewActions,
    prepareDetailBackTarget: deps.prepareDetailBackTarget,
    renderSmtSelection: deps.renderSmtSelection,
    renderAfterDetailDeleted: deps.renderAfterDetailDeleted,
    renderArchivePanel: deps.renderArchivePanel,
    openSidebar: deps.openSidebar,
    recordInspectorHistory: deps.recordInspectorHistory,
  });

  const archiveActions = createInspectorArchiveActionController({
    clickInspectorBodyAction: deps.clickInspectorBodyAction,
    confirmSync: deps.confirmSync,
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
    closeInspectorActionMenus: deps.closeInspectorActionMenus,
    calendarActions,
    renderPageFromState: deps.renderPageFromState,
    popInspectorPage: deps.popInspectorPage,
    emitStatus: deps.emitStatus,
    captureCalendarOpenGroups: deps.captureCalendarOpenGroups,
    pushInspectorPage: deps.pushInspectorPage,
    getCalendarSelectedDate: deps.getCalendarSelectedDate,
    getCalendarViewDate: deps.getCalendarViewDate,
    getCalendarOpenGroups: deps.getCalendarOpenGroups,
    renderEntryContextCatalogMaintenance: deps.renderEntryContextCatalogMaintenance,
    dailyTimeActions,
    chartNoteActions,
    getNextCalendarViewDate: deps.getNextCalendarViewDate,
    getDefaultCalendarDate: deps.getDefaultCalendarDate,
    setCalendarViewDate: deps.setCalendarViewDate,
    refreshSelection: deps.refreshSelection,
    archiveActions,
    smtActions,
    liveRecordActions,
    entryContextCatalogActions,
    orderReviewActions,
    drawingSetActions,
    segmentActions,
    pdaActions,
    getCurrentSegment: deps.getCurrentSegment,
    getCurrentSegmentGroup: deps.getCurrentSegmentGroup,
    getCurrentAnnotation: deps.getCurrentAnnotation,
  });

  const pageRouter = createInspectorPageRouter({
    getState: deps.getInspectorSidebarState,
    setCalendarState: deps.setCalendarState,
    setCurrentPanel: deps.setCurrentPanel,
    setSelectedSmtId: deps.setSelectedSmtId,
    setCalendarDateContext: deps.setCalendarDateContext,
    getDefaultCalendarDate: deps.getDefaultCalendarDate,
    getOrderReviewPanelOptions: deps.getOrderReviewPanelOptions,
    renderInspectorBackAction: deps.renderInspectorBackAction,
    setInspectorBody: deps.setInspectorBody,
    replaceInspectorPage: deps.replaceInspectorPage,
    popInspectorPage: deps.popInspectorPage,
    getAnnotationById: deps.getAnnotationById,
    getSegmentById: deps.getSegmentById,
    getSegmentGroupById: deps.getSegmentGroupById,
    getSmtRecordById: deps.getSmtRecordById,
    getSmtRecords: deps.getSmtRecords,
    getOrderReviewById: deps.getOrderReviewById,
    getLiveRecordById: deps.getLiveRecordById,
    getDailyTimeReviewByDate: deps.getDailyTimeReviewByDate,
    getOrCreateDailyTimeReview: deps.getOrCreateDailyTimeReview,
    getEconomicEventById: deps.getEconomicEventById,
    dailyTimeActions,
    orderReviewActions,
    liveRecordActions,
    clearPdaSelection: deps.clearPdaSelection,
    clearSegmentSelection: deps.clearSegmentSelection,
    clearSegmentGroupSelection: deps.clearSegmentGroupSelection,
  });

  const calendarSync = createInspectorCalendarSync({
    bus: deps.bus,
    store: deps.store,
    getReplayVisibleBars: deps.getReplayVisibleBars,
    updateTimeOverlaySettings: deps.updateTimeOverlaySettings,
    getInspectorPage: deps.getInspectorPage,
    getCurrentPanel: deps.getCurrentPanel,
    getCalendarState: deps.getInspectorSidebarState,
    setCalendarState: deps.setCalendarState,
    captureCalendarOpenGroups: deps.captureCalendarOpenGroups,
    refreshSelection: deps.refreshSelection,
    isInspectorShellOpen: deps.isInspectorShellOpen,
    isCalendarClickFollowBlocked: deps.isCalendarClickFollowBlocked,
    clearPdaSelection: deps.clearPdaSelection,
    clearSegmentSelection: deps.clearSegmentSelection,
    clearSegmentGroupSelection: deps.clearSegmentGroupSelection,
    clearSelectedSmt: () => deps.setSelectedSmtId(null),
    resetInspectorPage: deps.resetInspectorPage,
    renderEmpty: deps.renderEmpty,
    openSidebar: deps.openSidebar,
  });

  return {
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
  };
}
