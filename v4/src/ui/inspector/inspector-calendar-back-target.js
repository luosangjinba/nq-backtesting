export function createInspectorCalendarBackTarget({
  getCalendarSelectedDate,
  getCalendarViewDate,
  getCalendarOpenGroups,
  setCalendarDateContext,
  setCalendarDate,
  captureCalendarOpenGroups,
  getInspectorPage,
  resetInspectorPage,
  pushInspectorPage,
  getOrderReviewById,
  getOrderReviewCalendarDate,
}) {
  function syncCalendarToOrderReview(orderReviewId) {
    const order = getOrderReviewById(orderReviewId);
    const dateKey = getOrderReviewCalendarDate(order);
    if (!dateKey) return false;
    setCalendarDate(dateKey, dateKey);
    return true;
  }

  function prepareDetailBackTarget(dateKey) {
    if (!setCalendarDateContext(dateKey)) return false;
    captureCalendarOpenGroups();
    resetInspectorPage({
      kind: 'home',
      selectedDate: dateKey,
      viewDate: dateKey,
      openGroups: Array.from(getCalendarOpenGroups()),
    });
    pushInspectorPage({ kind: 'detail', selectedDate: dateKey, viewDate: dateKey });
    return true;
  }

  function prepareSelectionBackTarget(dateKey) {
    const page = getInspectorPage();
    if (page.kind === 'detail' && page.objectType && page.objectId) {
      pushInspectorPage({
        ...page,
        selectedDate: getCalendarSelectedDate(),
        viewDate: getCalendarViewDate(),
        openGroups: Array.from(getCalendarOpenGroups()),
      });
      return true;
    }
    return prepareDetailBackTarget(dateKey);
  }

  return {
    syncCalendarToOrderReview,
    prepareDetailBackTarget,
    prepareSelectionBackTarget,
  };
}
