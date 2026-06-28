import * as bus from '../../event-bus.js';

export function initInspectorSelectionRouter({
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
  getSuppressSelectionBackTarget,
  getSuppressActiveReviewRender,
  prepareSelectionBackTarget,
  renderAnnotation,
  renderSegment,
  renderSegmentGroup,
  renderSmtSelection,
  renderArchivePanel,
  renderEmpty,
  renderSelectedLiveRecordPanel,
  showActiveOrderSetupPanel,
  openSidebar,
  refreshSelection,
  refreshOnEntryContextCatalogChange,
  refreshSelectionUnlessEditingDailyTimeText,
  refreshOnReplayDayChange,
  openCalendarDate,
  setSelectedSmtId,
  setCalendarDate,
  clearCalendarDate,
  getAnnotationCalendarDate,
  getSegmentCalendarDate,
  getCompositeCalendarDate,
  getSmtCalendarDate,
  entryContextCatalogChangedEvent,
}) {
  bus.on('pda:selected', ({ annotation }) => {
    if (dailyTimeActions.isPicking()) {
      dailyTimeActions.handlePickedPda(annotation);
      return;
    }
    if (orderReviewActions.isReasonRefPicking()) {
      orderReviewActions.handlePickedPda(annotation);
      return;
    }
    if (liveRecordActions.isPicking()) {
      liveRecordActions.handlePickedPda(annotation);
      return;
    }
    if (!getSuppressSelectionBackTarget()) prepareSelectionBackTarget(getAnnotationCalendarDate(annotation));
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
    if (orderReviewActions.isReasonRefPicking()) {
      orderReviewActions.handlePickedSegment(segment);
      return;
    }
    if (liveRecordActions.isPicking()) {
      liveRecordActions.handlePickedSegment(segment);
      return;
    }
    if (!getSuppressSelectionBackTarget()) prepareSelectionBackTarget(getSegmentCalendarDate(segment));
    renderSegment(segment);
    openSidebar();
  });
  bus.on('segment-group:selected', ({ segmentGroup }) => {
    if (dailyTimeActions.isPicking()) {
      dailyTimeActions.handlePickedComposite(segmentGroup);
      return;
    }
    if (orderReviewActions.isReasonRefPicking()) {
      orderReviewActions.handlePickedComposite(segmentGroup);
      return;
    }
    if (liveRecordActions.isPicking()) {
      liveRecordActions.handlePickedComposite(segmentGroup);
      return;
    }
    if (!getSuppressSelectionBackTarget()) prepareSelectionBackTarget(getCompositeCalendarDate(segmentGroup));
    renderSegmentGroup(segmentGroup);
    openSidebar();
  });
  bus.on('segment:selection-cleared', refreshSelection);
  bus.on('segment-group:selection-cleared', refreshSelection);
  bus.on('segment:changed', refreshSelection);
  bus.on('segment-group:changed', refreshSelection);
  bus.on('drawing-set-focus:changed', refreshSelection);
  bus.on('smt:changed', refreshSelection);
  bus.on('smt:selected', ({ record }) => {
    if (!record) return;
    if (dailyTimeActions.isPicking()) {
      dailyTimeActions.handlePickedSmt(record);
      return;
    }
    if (orderReviewActions.isReasonRefPicking()) {
      orderReviewActions.handlePickedSmt(record);
      return;
    }
    if (liveRecordActions.isPicking()) {
      liveRecordActions.handlePickedSmt(record);
      return;
    }
    if (!getSuppressSelectionBackTarget()) prepareSelectionBackTarget(getSmtCalendarDate(record));
    setSelectedSmtId(record.id);
    renderSmtSelection();
    openSidebar();
  });
  bus.on('smt:selection-cleared', () => {
    setSelectedSmtId(null);
    refreshSelection();
  });
  bus.on('order-review:changed', refreshSelection);
  bus.on('live-record:changed', refreshSelection);
  bus.on(entryContextCatalogChangedEvent, refreshOnEntryContextCatalogChange);
  bus.on('daily-time-review:changed', refreshSelectionUnlessEditingDailyTimeText);
  bus.on('chart-notes:changed', refreshSelection);
  bus.on('economic-event-notes:changed', refreshSelection);
  bus.on('chart-note:selected', ({ note }) => {
    if (orderReviewActions.isReasonRefPicking()) {
      orderReviewActions.handlePickedChartNote(note);
      return;
    }
    if (liveRecordActions.isPicking()) {
      liveRecordActions.handlePickedChartNote(note);
    }
  });
  bus.on('economic-calendar:changed', refreshSelection);
  bus.on('daily-regime:changed', refreshSelection);
  bus.on('time-overlays:changed', refreshSelection);
  bus.on('replay:changed', refreshOnReplayDayChange);
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
  bus.on('live-record-element:selected', renderSelectedLiveRecordPanel);
  bus.on('live-record-element:selection-cleared', refreshSelection);
  bus.on('order-review-active:changed', ({ activeReviewSetId }) => {
    if (getSuppressActiveReviewRender()) return;
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
    clearCalendarDate();
    renderEmpty();
  });
  bus.on('bars:loaded', () => {
    const date = getDefaultCalendarDate();
    setCalendarDate(date, date);
    refreshSelection();
  });
}
