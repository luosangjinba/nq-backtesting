export function createInspectorActionRouter({
  closeInspectorActionMenus,
  calendarActions,
  renderPageFromState,
  popInspectorPage,
  emitStatus,
  captureCalendarOpenGroups,
  pushInspectorPage,
  getCalendarSelectedDate,
  getCalendarViewDate,
  getCalendarOpenGroups,
  renderEntryContextCatalogMaintenance,
  dailyTimeActions,
  chartNoteActions,
  getNextCalendarViewDate,
  getDefaultCalendarDate,
  setCalendarViewDate,
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
}) {
  function handleClick(e) {
    const actionMenu = e.target.closest('.order-review-ref-menu, .calendar-object-menu');
    const actionEl = e.target.closest('[data-inspector-action]');
    const isMenuAction = Boolean(actionEl?.closest('.order-review-ref-menu-panel, .calendar-object-menu-panel'));
    closeInspectorActionMenus(isMenuAction ? null : actionMenu);

    const action = actionEl?.dataset.inspectorAction;
    if (!action) return;
    if (action === 'calendar-day-group-toggle-hidden') {
      e.preventDefault();
      e.stopPropagation();
    }

    if (calendarActions.handleClick(action, actionEl)) return;

    if (action === 'inspector-back') {
      renderPageFromState(popInspectorPage());
      emitStatus({ text: 'Returned', isError: false });
      return;
    }

    if (action === 'entry-context-catalog-open') {
      captureCalendarOpenGroups();
      pushInspectorPage({
        kind: 'entry-context-catalog',
        selectedDate: getCalendarSelectedDate(),
        viewDate: getCalendarViewDate(),
        openGroups: Array.from(getCalendarOpenGroups()),
      });
      renderEntryContextCatalogMaintenance();
      return;
    }

    if (dailyTimeActions.handleClick(action, actionEl)) return;
    if (chartNoteActions.handleClick(action, actionEl)) return;

    if (action === 'calendar-prev-month' || action === 'calendar-next-month') {
      setCalendarViewDate(getNextCalendarViewDate(
        getCalendarViewDate() || getCalendarSelectedDate() || getDefaultCalendarDate(),
        action === 'calendar-prev-month' ? 'prev' : 'next'
      ));
      refreshSelection();
      return;
    }

    if (archiveActions.handleClick(action)) return;
    if (smtActions.handleClick(action, actionEl)) return;
    if (liveRecordActions.handleClick(action, actionEl)) return;
    if (entryContextCatalogActions.handleClick(action, actionEl)) return;
    if (orderReviewActions.handleOrderReviewClick(action, actionEl)) return;
    if (drawingSetActions.handleClick(action, actionEl)) return;

    const segment = getCurrentSegment();
    if (segment && orderReviewActions.handleOrderReviewClick(action, actionEl, { segment })) return;

    const segmentGroup = getCurrentSegmentGroup();
    if (segmentGroup && orderReviewActions.handleOrderReviewClick(action, actionEl, { segmentGroup })) return;

    if (segmentActions.handleSegmentClick(action, actionEl)) return;

    const annotation = getCurrentAnnotation();
    if (!annotation) return;

    if (orderReviewActions.handleOrderReviewClick(action, actionEl, { annotation })) return;

    pdaActions.handlePdaClick(action, actionEl);
  }

  return {
    handleClick,
  };
}
