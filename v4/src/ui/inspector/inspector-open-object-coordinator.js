import { INSPECTOR_DETAIL_TYPES } from './inspector-panel-registry.js';

export function createInspectorOpenObjectCoordinator({
  getCalendarSelectedDate,
  getCalendarViewDate,
  setCalendarDateContext,
  setSelectedSmtId,
  setSuppressActiveReviewRender,
  setSuppressSelectionBackTarget,
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
}) {
  function getDetailPage(objectType, objectId, extra = {}) {
    return {
      kind: 'detail',
      objectType,
      objectId,
      selectedDate: getCalendarSelectedDate(),
      viewDate: getCalendarViewDate(),
      ...extra,
    };
  }

  function clearObjectSelections() {
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
  }

  function openCalendarObject(type, id, options = {}) {
    if (!type || !id) return false;
    if (type === 'order-setup') {
      setSuppressActiveReviewRender(true);
      let selected = false;
      try {
        selected = Boolean(setActiveReviewSet(id));
      } finally {
        setSuppressActiveReviewRender(false);
      }
      if (!selected) return false;
      clearObjectSelections();
      syncCalendarToOrderReview(id);
      pushInspectorPage(getDetailPage(INSPECTOR_DETAIL_TYPES.ORDER_SETUP, id));
      renderOrderSetupDetail(id);
      return true;
    }
    if (type === 'live-record') {
      if (!getLiveRecordById(id)) return false;
      setActiveLiveRecord(id);
      clearObjectSelections();
      pushInspectorPage(getDetailPage(INSPECTOR_DETAIL_TYPES.LIVE_RECORD, id));
      renderLiveRecordDetail(id);
      return true;
    }
    if (type === 'pda') {
      if (!getAnnotationById(id)) return false;
      clearSegmentSelection();
      clearSegmentGroupSelection();
      pushInspectorPage(getDetailPage(INSPECTOR_DETAIL_TYPES.PDA, id));
      setSuppressSelectionBackTarget(true);
      try {
        return Boolean(selectPda(id));
      } finally {
        setSuppressSelectionBackTarget(false);
      }
    }
    if (type === 'segment') {
      if (!getSegmentById(id)) return false;
      pushInspectorPage(getDetailPage(INSPECTOR_DETAIL_TYPES.SEGMENT, id));
      setSuppressSelectionBackTarget(true);
      try {
        return Boolean(selectSegment(id));
      } finally {
        setSuppressSelectionBackTarget(false);
      }
    }
    if (type === 'composite') {
      if (!getSegmentGroupById(id)) return false;
      pushInspectorPage(getDetailPage(INSPECTOR_DETAIL_TYPES.COMPOSITE, id));
      setSuppressSelectionBackTarget(true);
      try {
        return Boolean(selectSegmentGroup(id));
      } finally {
        setSuppressSelectionBackTarget(false);
      }
    }
    if (type === 'smt') {
      if (!getSmtRecordById(id)) return false;
      pushInspectorPage(getDetailPage(INSPECTOR_DETAIL_TYPES.SMT, id));
      setSelectedSmtId(id);
      clearObjectSelections();
      renderSmtSelection();
      return true;
    }
    if (type === 'time-reaction') {
      if (!String(id || '').match(/^\d{4}-\d{2}-\d{2}$/)) return false;
      setCalendarDateContext(id);
      clearObjectSelections();
      setSelectedSmtId(null);
      pushInspectorPage(getDetailPage(INSPECTOR_DETAIL_TYPES.TIME_REACTION, id, {
        sectionKey: options.sectionKey || '',
      }));
      renderDailyTimeReviewDetail(id, options.sectionKey || '');
      return true;
    }
    if (type === 'economic-event') {
      if (!getEconomicEventById(id)) return false;
      clearObjectSelections();
      setSelectedSmtId(null);
      pushInspectorPage(getDetailPage(INSPECTOR_DETAIL_TYPES.ECONOMIC_EVENT, id));
      renderEconomicEventDetail(id);
      return true;
    }
    return false;
  }

  return { openCalendarObject };
}
