import * as bus from '../../event-bus.js';
import * as chart from '../../chart/chart-manager.js';
import * as secondaryChart from '../../chart/secondary-chart-manager.js';
import * as store from '../../data/bar-store.js';
import * as secondaryStore from '../../data/secondary-chart-store.js';
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
import { createRafThrottle } from '../../utils/raf-throttle.js';
import {
  findDisplayBarByChartTime,
  getAutoExitReasonMessage,
  getBarChartTime,
  isAutoExitResult,
  parseDateTimeInput,
  parseOrderReviewFieldValue,
} from './order-review-utils.js';

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
  if (role === 'marketStructureShift') {
    return {
      entryPlan: {
        marketStructureShift: null,
        marketStructureShiftTimestamp: null,
        marketStructureShiftTimeframe: 'manual',
        marketStructureShiftEndTimestamp: null,
        marketStructureShiftEndTimeframe: 'manual',
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
  if (role === 'targetInternal2') {
    return {
      entryPlan: {
        targetInternal2: null,
        targetInternal2Timestamp: null,
        targetInternal2Timeframe: 'manual',
        targetInternal2EndTimestamp: null,
        targetInternal2EndTimeframe: 'manual',
      },
    };
  }
  if (role === 'targetInternal3') {
    return {
      entryPlan: {
        targetInternal3: null,
        targetInternal3Timestamp: null,
        targetInternal3Timeframe: 'manual',
        targetInternal3EndTimestamp: null,
        targetInternal3EndTimeframe: 'manual',
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
  if (role === 'targetExternal2') {
    return {
      entryPlan: {
        targetExternal2: null,
        targetExternal2Timestamp: null,
        targetExternal2Timeframe: 'manual',
        targetExternal2EndTimestamp: null,
        targetExternal2EndTimeframe: 'manual',
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

function getPickChartContext(e) {
  const isSecondary = e?.currentTarget?.id === 'secondary-chart';
  if (isSecondary) {
    return {
      chartId: 'secondary',
      chartEl: document.getElementById('secondary-chart'),
      coordinateToTime: (x) => secondaryChart.getSecondaryChart()?.timeScale().coordinateToTime(x),
      findBar: (time) => findDisplayBarByChartTime(
        time,
        secondaryStore.getSecondaryDisplayBars(),
        secondaryStore.getSecondaryTimeframe()
      ),
      showCursor: secondaryChart.showSecondaryPickPreviewCursor,
      hideCursor: secondaryChart.hideSecondaryPickPreviewCursor,
      timeframe: () => secondaryStore.getSecondaryTimeframe(),
    };
  }
  return {
    chartId: 'primary',
    chartEl: document.getElementById('chart'),
    coordinateToTime: chart.coordinateToTime,
    findBar: (time) => findDisplayBarByChartTime(time),
    showCursor: chart.showPickPreviewCursor,
    hideCursor: chart.hidePickPreviewCursor,
    timeframe: () => store.getCurrentTimeframe(),
  };
}

export function createOrderReviewEditActionController({
  expandOrder,
  refreshSelection,
  recordInspectorHistory,
} = {}) {
  let exitPickState = null;
  let lastExitPickHandledAt = 0;
  let autoExitRequestSeq = 0;

  function clearExitPickState({ silent = false } = {}) {
    if (!exitPickState) return false;
    exitPickState = null;
    chart.hidePickPreviewCursor();
    secondaryChart.hideSecondaryPickPreviewCursor();
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

    expandOrder?.(orderReviewId);
    const value = parseOrderReviewFieldValue(target);

    recordInspectorHistory?.('Update Order Entry', () => updateOrderReview(orderReviewId, {
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

    expandOrder?.(orderReviewId);
    const value = parseOrderReviewFieldValue(target);
    recordInspectorHistory?.('Update Order Display', () => updateOrderReview(orderReviewId, {
      display: {
        [field]: value,
      },
    }));
    return true;
  }

  function updateOrderReviewTargetAction(target) {
    const orderReviewId = target.dataset.orderReviewId;
    const role = target.dataset.orderTargetRole;
    if (!orderReviewId || !role) return false;
    const order = getOrderReviewById(orderReviewId);
    if (!order) return false;

    expandOrder?.(orderReviewId);
    recordInspectorHistory?.('Update Target Execution Action', () => updateOrderReview(orderReviewId, {
      resultReview: {
        targetActions: {
          ...(order.resultReview?.targetActions || {}),
          [role]: { action: target.value },
        },
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
    expandOrder?.(orderReviewId);
    recordInspectorHistory?.('Update Exit Time', () => updateOrderReview(orderReviewId, {
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
    recordInspectorHistory?.('Toggle Order Setup Element Visibility', () => updateOrderReview(orderReviewId, {
      display: {
        ...(order.display || {}),
        elementVisibility,
      },
    }));
    refreshSelection?.();
    return true;
  }

  function deleteOrderSetupElement(target) {
    const orderReviewId = target.dataset.orderReviewId;
    const role = target.dataset.orderSetupElement;
    const patch = getOrderSetupElementDeletePatch(role);
    if (!orderReviewId || !patch) return false;
    recordInspectorHistory?.('Delete Order Setup Element', () => updateOrderReview(orderReviewId, patch));
    clearOrderSetupElementSelection();
    refreshSelection?.();
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
      recordInspectorHistory?.('Update Order Result', () => {
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

  function handleChange(action, target) {
    if (action === 'order-review-note') {
      recordInspectorHistory?.('Update Order Note', () =>
        updateOrderReview(target.dataset.orderReviewId, { note: target.value })
      );
      return true;
    }

    if (action === 'order-review-summary') {
      recordInspectorHistory?.('Update Order Summary', () =>
        updateOrderReview(target.dataset.orderReviewId, { summary: target.value })
      );
      return true;
    }

    if (action === 'order-review-result') {
      updateOrderReviewResult(target.dataset.orderReviewId, target.value);
      return true;
    }

    if (action === 'order-review-target-action') {
      return updateOrderReviewTargetAction(target);
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

    return false;
  }

  function handleClick(action, actionEl) {
    if (action === 'order-review-result-exit-pick') {
      return startExitBarPick(actionEl.dataset.orderReviewId);
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

    const pickContext = getPickChartContext(e);
    if (!pickContext.chartEl) return;

    const rect = pickContext.chartEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pickContext.coordinateToTime(x);
    const bar = pickContext.findBar(time);
    if (!bar) {
      pickContext.hideCursor();
      return;
    }

    const order = getOrderReviewById(exitPickState.orderReviewId);
    if (!order) {
      clearExitPickState({ silent: true });
      return;
    }

    const orderReviewId = exitPickState.orderReviewId;
    lastExitPickHandledAt = Date.now();
    clearExitPickState({ silent: true });
    recordInspectorHistory?.('Pick Exit Bar', () => updateOrderReview(orderReviewId, {
      resultReview: {
        exitTimestamp: bar.timestamp,
      },
    }));
    bus.emit('status:update', {
      text: `Exit Bar 已选择: ${bar.time || bar.tradingDay} (${timeframeToString(pickContext.timeframe())})`,
      isError: false,
    });
    refreshSelection?.();
  }

  function handleExitPickHover(param, source = 'primary') {
    if (!exitPickState) return;
    if (source === 'secondary') chart.hidePickPreviewCursor();
    else secondaryChart.hideSecondaryPickPreviewCursor();
    const pickContext = source === 'secondary'
      ? getPickChartContext({ currentTarget: { id: 'secondary-chart' } })
      : getPickChartContext({ currentTarget: { id: 'chart' } });
    const bar = pickContext.findBar(param?.time);
    if (!bar) {
      pickContext.hideCursor();
      return;
    }
    pickContext.showCursor(getBarChartTime(bar, pickContext.timeframe()));
  }

  const handleExitPickHoverThrottled = createRafThrottle(handleExitPickHover);
  const handleSecondaryExitPickHoverThrottled = createRafThrottle((param) =>
    handleExitPickHover(param, 'secondary')
  );

  return {
    clearExitPickState,
    handleChange,
    handleClick,
    handleExitPickChartClick,
    handleExitPickHover: handleExitPickHoverThrottled,
    handleSecondaryExitPickHover: handleSecondaryExitPickHoverThrottled,
    didExitPickJustHandleClick: () => Date.now() - lastExitPickHandledAt < 250,
    isExitPicking: () => Boolean(exitPickState),
  };
}
