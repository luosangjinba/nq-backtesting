import { recordHistory } from '../../history/history-manager.js';
import { createOrderReviewReasonActionController } from './order-review-reason-actions.js';
import { createOrderReviewLifecycleActionController } from './order-review-lifecycle-actions.js';
import { createOrderReviewEditActionController } from './order-review-edit-actions.js';

export { buildPdaOrderReviewRef, buildSegmentOrderReviewRef } from './order-review-reason-actions.js';

// Facade kept as the stable Inspector entry point while focused action modules own behavior.
function recordInspectorHistory(label, mutator) {
  return recordHistory(label, mutator);
}

export function createOrderReviewActionController({
  getExpandedOrderReviewId,
  setExpandedOrderReviewId,
  getSelectedSmtId,
  getCompositeTimestamp,
  syncCalendarToOrderReview,
  refreshSelection,
}) {
  function expandOrder(orderReviewId) {
    if (orderReviewId) setExpandedOrderReviewId(orderReviewId);
  }

  const reasonActions = createOrderReviewReasonActionController({
    getSelectedSmtId,
    expandOrder,
    refreshSelection,
    recordInspectorHistory,
  });

  const lifecycleActions = createOrderReviewLifecycleActionController({
    getCompositeTimestamp,
    expandOrder,
    syncCalendarToOrderReview,
    refreshSelection,
    recordInspectorHistory,
  });

  const editActions = createOrderReviewEditActionController({
    expandOrder,
    refreshSelection,
    recordInspectorHistory,
  });

  function handleOrderReviewChange(action, target) {
    if (editActions.handleChange(action, target)) {
      return true;
    }

    if (reasonActions.handleChange(action, target)) {
      return true;
    }

    return false;
  }

  function handleOrderReviewClick(action, actionEl, context = {}) {
    if (lifecycleActions.handleClick(action, actionEl, context)) {
      return true;
    }

    if (reasonActions.handleClick(action, actionEl)) {
      return true;
    }

    if (editActions.handleClick(action, actionEl)) {
      return true;
    }

    return false;
  }

  return {
    clearExitPickState: editActions.clearExitPickState,
    clearReasonRefPick: reasonActions.clearRefPick,
    createOrderReviewFromComposite: lifecycleActions.createOrderReviewFromComposite,
    createOrderReviewFromSegment: lifecycleActions.createOrderReviewFromSegment,
    getPendingReasonRefPick: reasonActions.getPendingRefPick,
    handlePickedComposite: reasonActions.handlePickedComposite,
    handlePickedChartNote: reasonActions.handlePickedChartNote,
    handlePickedPda: reasonActions.handlePickedPda,
    handlePickedSegment: reasonActions.handlePickedSegment,
    handlePickedSmt: reasonActions.handlePickedSmt,
    handleExitPickChartClick: editActions.handleExitPickChartClick,
    handleExitPickHover: editActions.handleExitPickHover,
    handleOrderReviewChange,
    handleOrderReviewClick,
    isReasonRefPicking: reasonActions.isPicking,
    getExpandedOrderReviewId,
  };
}
