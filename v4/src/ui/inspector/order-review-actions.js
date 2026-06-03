import * as bus from '../../event-bus.js';
import * as chart from '../../chart/chart-manager.js';
import * as store from '../../data/bar-store.js';
import { timeframeToString } from '../../config.js';
import {
  clearOrderSetupElementSelection,
  selectOrderSetupElement,
} from '../../order/order-setup-selection.js';
import {
  getOrderReviewById,
  updateOrderReview,
} from '../../order/order-review-store.js';
import { calculateAutoExitTime } from '../../order/auto-exit-time.js';
import { getSetupSetById } from '../../order/setup-set.js';
import { recordHistory } from '../../history/history-manager.js';
import { createOrderReviewReasonActionController } from './order-review-reason-actions.js';
import { createOrderReviewLifecycleActionController } from './order-review-lifecycle-actions.js';
import {
  findDisplayBarByChartTime,
  getAutoExitReasonMessage,
  getBarChartTime,
  isAutoExitResult,
  parseDateTimeInput,
  parseOrderReviewFieldValue,
} from './order-review-utils.js';

export { buildPdaOrderReviewRef, buildSegmentOrderReviewRef } from './order-review-reason-actions.js';

function recordInspectorHistory(label, mutator) {
  return recordHistory(label, mutator);
}

function getOrderSetupElementDeletePatch(role) {
  if (role === 'entry') {
    return {
      entryPlan: {
        entryTimestamp: null,
        entryPrice: null,
        entryEndTimestamp: null,
        entryEndTimeframe: 'manual',
      },
    };
  }
  if (role === 'stopLoss') {
    return {
      entryPlan: {
        stopLoss: null,
        stopLossTimestamp: null,
        stopLossTimeframe: 'manual',
        stopLossEndTimestamp: null,
        stopLossEndTimeframe: 'manual',
      },
    };
  }
  if (role === 'target1') {
    return {
      entryPlan: {
        targetInternal: null,
        targetInternalTimestamp: null,
        targetInternalTimeframe: 'manual',
        targetInternalEndTimestamp: null,
        targetInternalEndTimeframe: 'manual',
      },
    };
  }
  if (role === 'target2') {
    return {
      entryPlan: {
        targetSwing: null,
        targetSwingTimestamp: null,
        targetSwingTimeframe: 'manual',
        targetSwingEndTimestamp: null,
        targetSwingEndTimeframe: 'manual',
      },
    };
  }
  if (role === 'target3') {
    return {
      entryPlan: {
        targetExternal: null,
        targetExternalTimestamp: null,
        targetExternalTimeframe: 'manual',
        targetExternalEndTimestamp: null,
        targetExternalEndTimeframe: 'manual',
      },
    };
  }
  if (role === 'finalTarget') {
    return {
      entryPlan: {
        finalTarget: null,
        finalTargetTimestamp: null,
        finalTargetTimeframe: 'manual',
        finalTargetEndTimestamp: null,
        finalTargetEndTimeframe: 'manual',
      },
    };
  }
  return null;
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

  let exitPickState = null;
  let autoExitRequestSeq = 0;

  function clearExitPickState({ silent = false } = {}) {
    if (!exitPickState) return false;
    exitPickState = null;
    chart.hidePickPreviewCursor();
    if (!silent) {
      bus.emit('status:update', { text: 'Exit bar pick 已取消', isError: false });
    }
    return true;
  }

  function startExitBarPick(orderReviewId) {
    autoExitRequestSeq += 1;
    const order = getOrderReviewById(orderReviewId);
    if (!order) {
      bus.emit('status:update', { text: 'Order Setup not found', isError: true });
      return true;
    }
    if (!store.getDisplayBars().length) {
      bus.emit('status:update', { text: '当前图表没有可 pick 的 K 线', isError: true });
      return true;
    }

    exitPickState = {
      orderReviewId,
    };
    bus.emit('status:update', { text: '点击图表选择 Exit Bar', isError: false });
    return true;
  }

  function updateOrderReviewEntryField(target) {
    const orderReviewId = target.dataset.orderReviewId;
    const field = target.dataset.orderReviewField;
    if (!orderReviewId || !field) return false;

    expandOrder(orderReviewId);
    const value = parseOrderReviewFieldValue(target);

    recordInspectorHistory('Update Order Entry', () => updateOrderReview(orderReviewId, {
      entryPlan: {
        [field]: value,
      },
    }));
    return true;
  }

  function updateOrderReviewDisplayField(target) {
    const orderReviewId = target.dataset.orderReviewId;
    const field = target.dataset.orderReviewField;
    if (!orderReviewId || !field) return false;

    expandOrder(orderReviewId);
    const value = parseOrderReviewFieldValue(target);
    recordInspectorHistory('Update Order Display', () => updateOrderReview(orderReviewId, {
      display: {
        [field]: value,
      },
    }));
    return true;
  }

  function updateOrderReviewExitTime(target) {
    const orderReviewId = target.dataset.orderReviewId;
    if (!orderReviewId) return false;
    autoExitRequestSeq += 1;
    const parsed = parseDateTimeInput(target.value);
    if (!parsed.ok) {
      bus.emit('status:update', { text: 'Exit Time 格式无效，请使用 YYYY-MM-DD HH:mm', isError: true });
      return true;
    }

    target.value = parsed.formatted;
    expandOrder(orderReviewId);
    recordInspectorHistory('Update Exit Time', () => updateOrderReview(orderReviewId, {
      resultReview: {
        exitTimestamp: parsed.timestamp,
      },
    }));
    bus.emit('status:update', {
      text: parsed.timestamp === null ? 'Exit Time cleared' : `Exit Time set: ${parsed.formatted}`,
      isError: false,
    });
    return true;
  }

  function toggleOrderSetupElementVisibility(target) {
    const orderReviewId = target.dataset.orderReviewId;
    const role = target.dataset.orderSetupElement;
    const order = getOrderReviewById(orderReviewId);
    if (!order || !role) return false;
    const elementVisibility = {
      ...(order.display?.elementVisibility || {}),
      [role]: order.display?.elementVisibility?.[role] === false,
    };
    recordInspectorHistory('Toggle Order Setup Element Visibility', () => updateOrderReview(orderReviewId, {
      display: {
        ...(order.display || {}),
        elementVisibility,
      },
    }));
    refreshSelection();
    return true;
  }

  function deleteOrderSetupElement(target) {
    const orderReviewId = target.dataset.orderReviewId;
    const role = target.dataset.orderSetupElement;
    const patch = getOrderSetupElementDeletePatch(role);
    if (!orderReviewId || !patch) return false;
    recordInspectorHistory('Delete Order Setup Element', () => updateOrderReview(orderReviewId, patch));
    clearOrderSetupElementSelection();
    refreshSelection();
    return true;
  }

  async function updateOrderReviewResult(orderReviewId, result) {
    const requestSeq = (autoExitRequestSeq += 1);
    let autoExit = null;
    let autoExitError = null;
    let setupSet = null;
    let elements = {};

    if (isAutoExitResult(result)) {
      setupSet = getSetupSetById(orderReviewId);
      elements = setupSet?.orderElements || {};
      try {
        autoExit = await calculateAutoExitTime({
          instrument: setupSet?.instrument || 'NQ',
          entryTimestamp: elements.entry?.timestamp,
          entryPrice: elements.entry?.price,
          direction: elements.entry?.direction || setupSet?.direction,
          stopPrice: elements.stopLoss?.price,
          targets: elements.targets || [],
          result,
        });
      } catch (err) {
        autoExitError = err;
      }
    } else {
      autoExit = { ok: false, reason: 'unsupported-result', skipped: true };
    }

    if (requestSeq !== autoExitRequestSeq) return;
    if (!getOrderReviewById(orderReviewId)) return;

    try {
      recordInspectorHistory('Update Order Result', () => {
        const resultReview = { result };
        if (autoExit?.ok) {
          resultReview.exitTimestamp = autoExit.exitTimestamp;
        }
        updateOrderReview(orderReviewId, {
          resultReview,
        });
      });
    } catch (err) {
      bus.emit('status:update', { text: `Update Result failed: ${err.message}`, isError: true });
      return;
    }

    if (autoExit?.ok) {
      bus.emit('status:update', { text: `Auto exit time set: ${autoExit.bar?.time || autoExit.exitTimestamp}`, isError: false });
    } else if (autoExitError) {
      bus.emit('status:update', { text: `Auto exit time failed: ${autoExitError.message}`, isError: true });
    } else if (!autoExit?.skipped) {
      bus.emit('status:update', { text: getAutoExitReasonMessage(autoExit?.reason), isError: true });
    }
  }

  function handleOrderReviewChange(action, target) {
    if (action === 'order-review-note') {
      recordInspectorHistory('Update Order Note', () =>
        updateOrderReview(target.dataset.orderReviewId, { note: target.value })
      );
      return true;
    }

    if (action === 'order-review-result') {
      updateOrderReviewResult(target.dataset.orderReviewId, target.value);
      return true;
    }

    if (action === 'order-review-result-exit-time') {
      return updateOrderReviewExitTime(target);
    }

    if (action === 'order-review-edit-field') {
      if (target.dataset.orderReviewSection === 'entryPlan') {
        updateOrderReviewEntryField(target);
      }
      return true;
    }

    if (action === 'order-review-display-field') {
      updateOrderReviewDisplayField(target);
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

    if (action === 'order-review-result-exit-pick') {
      return startExitBarPick(actionEl.dataset.orderReviewId);
    }

    if (reasonActions.handleClick(action, actionEl)) {
      return true;
    }

    if (action === 'order-setup-element-delete') {
      deleteOrderSetupElement(actionEl);
      return true;
    }

    if (action === 'order-setup-element-toggle-visibility') {
      toggleOrderSetupElementVisibility(actionEl);
      return true;
    }

    if (action === 'order-setup-element-select') {
      selectOrderSetupElement(actionEl.dataset.orderReviewId, actionEl.dataset.orderSetupElement);
      return true;
    }

    return false;
  }

  function handleExitPickChartClick(e) {
    if (!exitPickState) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const chartEl = document.getElementById('chart');
    if (!chartEl) return;

    const rect = chartEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = chart.coordinateToTime(x);
    const bar = findDisplayBarByChartTime(time);
    if (!bar) {
      chart.hidePickPreviewCursor();
      return;
    }

    const order = getOrderReviewById(exitPickState.orderReviewId);
    if (!order) {
      clearExitPickState({ silent: true });
      return;
    }

    const orderReviewId = exitPickState.orderReviewId;
    clearExitPickState({ silent: true });
    recordInspectorHistory('Pick Exit Bar', () => updateOrderReview(orderReviewId, {
      resultReview: {
        exitTimestamp: bar.timestamp,
      },
    }));
    bus.emit('status:update', {
      text: `Exit Bar 已选择: ${bar.time || bar.tradingDay} (${timeframeToString(store.getCurrentTimeframe())})`,
      isError: false,
    });
    refreshSelection();
  }

  function handleExitPickHover(param) {
    if (!exitPickState) return;
    const bar = findDisplayBarByChartTime(param?.time);
    if (!bar) {
      chart.hidePickPreviewCursor();
      return;
    }
    chart.showPickPreviewCursor(getBarChartTime(bar));
  }

  return {
    clearExitPickState,
    createOrderReviewFromComposite: lifecycleActions.createOrderReviewFromComposite,
    createOrderReviewFromSegment: lifecycleActions.createOrderReviewFromSegment,
    handleExitPickChartClick,
    handleExitPickHover,
    handleOrderReviewChange,
    handleOrderReviewClick,
    getExpandedOrderReviewId,
  };
}
