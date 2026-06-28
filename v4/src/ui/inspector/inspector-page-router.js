import { INSPECTOR_DETAIL_TYPES, isInspectorDetailType } from './inspector-panel-registry.js';
import {
  renderAnnotationDetail,
  renderDailyTimeReviewDetail as renderDailyTimeReviewDetailBody,
  renderEconomicEventDetail as renderEconomicEventDetailBody,
  renderEntryContextCatalogMaintenance as renderEntryContextCatalogMaintenanceBody,
  renderInspectorHome,
  renderLiveRecordDetail as renderLiveRecordDetailBody,
  renderOrderSetupDetail as renderOrderSetupDetailBody,
  renderSegmentDetail,
  renderSegmentGroupDetail,
  renderSmtDetail,
} from './inspector-detail-renderer.js';

export function createInspectorPageRouter(options = {}) {
  const {
    getState,
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
  } = options;

  function replacePage(page) {
    replaceInspectorPage({
      selectedDate: getState().calendarSelectedDate,
      viewDate: getState().calendarViewDate,
      ...page,
    });
  }

  function renderAnnotation(annotation) {
    setCurrentPanel('selection');
    replacePage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.PDA,
      objectId: annotation.id,
    });
    setInspectorBody(renderAnnotationDetail(annotation, { backActionHtml: renderInspectorBackAction() }));
  }

  function renderSegment(segment) {
    setCurrentPanel('selection');
    replacePage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.SEGMENT,
      objectId: segment.id,
    });
    setInspectorBody(renderSegmentDetail(segment, { backActionHtml: renderInspectorBackAction() }));
  }

  function renderSegmentGroup(segmentGroup) {
    setCurrentPanel('selection');
    replacePage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.COMPOSITE,
      objectId: segmentGroup.id,
    });
    setInspectorBody(renderSegmentGroupDetail(segmentGroup, { backActionHtml: renderInspectorBackAction() }));
  }

  function renderSmtSelection() {
    const { selectedSmtId } = getState();
    setCurrentPanel('selection');
    replacePage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.SMT,
      objectId: selectedSmtId,
    });
    setInspectorBody(renderSmtDetail(getSmtRecords(), {
      backActionHtml: renderInspectorBackAction(),
      selectedSmtId,
    }));
  }

  function renderOrderSetupDetail(orderReviewId) {
    const order = getOrderReviewById(orderReviewId);
    setCurrentPanel('detail');
    replacePage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.ORDER_SETUP,
      objectId: orderReviewId,
    });
    setInspectorBody(renderOrderSetupDetailBody(order, {
      backActionHtml: renderInspectorBackAction(),
      orderReviewPanelOptions: getOrderReviewPanelOptions({
        activeOrderReviewId: orderReviewId,
      }),
    }));
  }

  function renderLiveRecordDetail(liveRecordId) {
    const record = getLiveRecordById(liveRecordId);
    setCurrentPanel('detail');
    replacePage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.LIVE_RECORD,
      objectId: liveRecordId,
    });
    setInspectorBody(renderLiveRecordDetailBody(record, {
      backActionHtml: renderInspectorBackAction(),
      pendingReasonRefPick: liveRecordActions.getPendingRefPick?.(),
    }));
  }

  function renderDailyTimeReviewDetail(dateKey, sectionKey = '') {
    const review = getDailyTimeReviewByDate(dateKey) || getOrCreateDailyTimeReview(dateKey);
    setCurrentPanel('detail');
    setCalendarDateContext(dateKey);
    replacePage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.TIME_REACTION,
      objectId: dateKey,
      sectionKey,
    });
    setInspectorBody(renderDailyTimeReviewDetailBody(review, {
      backActionHtml: renderInspectorBackAction(),
      sectionKey,
      pendingRefPick: dailyTimeActions.getPendingRefPick(),
      pendingReasonRefPick: orderReviewActions.getPendingReasonRefPick(),
    }));
  }

  function renderEconomicEventDetail(eventId) {
    const event = getEconomicEventById(eventId);
    if (!event) return false;
    setCurrentPanel('economic-event-detail');
    replacePage({
      kind: 'detail',
      objectType: INSPECTOR_DETAIL_TYPES.ECONOMIC_EVENT,
      objectId: eventId,
    });
    setInspectorBody(renderEconomicEventDetailBody(event, { backActionHtml: renderInspectorBackAction() }));
    return true;
  }

  function renderEntryContextCatalogMaintenance() {
    const { calendarSelectedDate, calendarViewDate, calendarOpenGroups } = getState();
    setCurrentPanel('entry-context-catalog');
    replaceInspectorPage({
      kind: 'entry-context-catalog',
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
      openGroups: Array.from(calendarOpenGroups),
    });
    setInspectorBody(renderEntryContextCatalogMaintenanceBody({ backActionHtml: renderInspectorBackAction() }));
  }

  function renderEmpty() {
    let { calendarSelectedDate, calendarViewDate, calendarOpenGroups } = getState();
    setCurrentPanel('empty');
    if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
    if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
    setCalendarState({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate });
    replaceInspectorPage({
      kind: 'home',
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
      openGroups: Array.from(calendarOpenGroups),
    });
    setInspectorBody(renderInspectorHome({
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
      openGroups: calendarOpenGroups,
    }));
  }

  function renderArchivePanel() {
    let { calendarSelectedDate, calendarViewDate, calendarOpenGroups } = getState();
    setCurrentPanel('archive');
    if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
    if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
    setCalendarState({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate });
    replaceInspectorPage({
      kind: 'archive',
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
      openGroups: Array.from(calendarOpenGroups),
    });
    setInspectorBody(renderInspectorHome({
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
      openGroups: calendarOpenGroups,
    }));
  }

  function renderPageFromState(page) {
    if (page.kind === 'archive') {
      renderArchivePanel();
      return;
    }
    if (page.kind === 'entry-context-catalog') {
      renderEntryContextCatalogMaintenance();
      return;
    }
    if (page.kind === 'detail') {
      if (!isInspectorDetailType(page.objectType)) {
        renderPageFromState(popInspectorPage());
        return;
      }
      if (page.objectType === INSPECTOR_DETAIL_TYPES.ORDER_SETUP && getOrderReviewById(page.objectId)) {
        renderOrderSetupDetail(page.objectId);
        return;
      }
      if (page.objectType === INSPECTOR_DETAIL_TYPES.LIVE_RECORD && getLiveRecordById(page.objectId)) {
        renderLiveRecordDetail(page.objectId);
        return;
      }
      if (page.objectType === INSPECTOR_DETAIL_TYPES.PDA) {
        const annotation = getAnnotationById(page.objectId);
        if (annotation) {
          renderAnnotation(annotation);
          return;
        }
      }
      if (page.objectType === INSPECTOR_DETAIL_TYPES.SEGMENT) {
        const segment = getSegmentById(page.objectId);
        if (segment) {
          renderSegment(segment);
          return;
        }
      }
      if (page.objectType === INSPECTOR_DETAIL_TYPES.COMPOSITE) {
        const segmentGroup = getSegmentGroupById(page.objectId);
        if (segmentGroup) {
          renderSegmentGroup(segmentGroup);
          return;
        }
      }
      if (page.objectType === INSPECTOR_DETAIL_TYPES.SMT && getSmtRecordById(page.objectId)) {
        setSelectedSmtId(page.objectId);
        renderSmtSelection();
        return;
      }
      if (
        page.objectType === INSPECTOR_DETAIL_TYPES.TIME_REACTION &&
        String(page.objectId || '').match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        renderDailyTimeReviewDetail(page.objectId, page.sectionKey || '');
        return;
      }
      if (page.objectType === INSPECTOR_DETAIL_TYPES.ECONOMIC_EVENT && renderEconomicEventDetail(page.objectId)) {
        return;
      }
      renderPageFromState(popInspectorPage());
      return;
    }
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    setSelectedSmtId(null);
    renderEmpty();
  }

  function renderAfterDetailDeleted() {
    renderPageFromState(popInspectorPage());
  }

  return {
    renderAnnotation,
    renderSegment,
    renderSegmentGroup,
    renderSmtSelection,
    renderOrderSetupDetail,
    renderLiveRecordDetail,
    renderDailyTimeReviewDetail,
    renderEconomicEventDetail,
    renderEntryContextCatalogMaintenance,
    renderEmpty,
    renderArchivePanel,
    renderPageFromState,
    renderAfterDetailDeleted,
  };
}
