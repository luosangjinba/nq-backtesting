export function createInspectorChangeRouter({
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
}) {
  function handleChange(e) {
    const action = e.target.dataset.inspectorAction;
    if (!action) return;

    if (archiveActions.handleChange(action, e.target)) return;
    if (smtActions.handleChange(action, e.target)) return;
    if (dailyTimeActions.handleChange(action, e.target)) return;
    if (chartNoteActions.handleChange(action, e.target)) return;
    if (economicEventActions.handleChange(action, e.target)) return;
    if (liveRecordActions.handleChange(action, e.target)) return;
    if (entryContextCatalogActions.handleChange(action, e.target)) return;
    if (orderReviewActions.handleOrderReviewChange(action, e.target)) return;
    if (segmentActions.handleSegmentChange(action, e.target)) return;

    pdaActions.handlePdaChange(action, e.target);
  }

  return {
    handleChange,
  };
}
