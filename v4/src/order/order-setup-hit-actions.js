import * as bus from '../event-bus.js';
import { recordHistory } from '../history/history-manager.js';
import { clearActiveLiveRecord } from '../live-record/live-record-active.js';
import {
  clearActiveReviewSet,
  setActiveReviewSet,
} from './order-review-active.js';
import {
  deleteOrderReview,
  getOrderReviewById,
  updateOrderReview,
} from './order-review-store.js';
import {
  clearOrderSetupElementSelection,
  selectOrderSetupElement,
} from './order-setup-selection.js';
import { getOrderSetupElementLabel } from './order-setup-chart-menu.js';

function getOrderSetupElementDeletePatch(role) {
  if (role === 'entry') return { entryPlan: { entryTimestamp: null, entryPrice: null, entryEndTimestamp: null, entryEndTimeframe: 'manual' } };
  if (role === 'marketStructureShift') return { entryPlan: { marketStructureShift: null, marketStructureShiftTimestamp: null, marketStructureShiftTimeframe: 'manual', marketStructureShiftEndTimestamp: null, marketStructureShiftEndTimeframe: 'manual' } };
  if (role === 'stopLoss') return { entryPlan: { stopLoss: null, stopLossTimestamp: null, stopLossTimeframe: 'manual', stopLossEndTimestamp: null, stopLossEndTimeframe: 'manual' } };
  if (role === 'target1') return { entryPlan: { targetInternal: null, targetInternalTimestamp: null, targetInternalTimeframe: 'manual', targetInternalEndTimestamp: null, targetInternalEndTimeframe: 'manual' } };
  if (role === 'targetInternal2') return { entryPlan: { targetInternal2: null, targetInternal2Timestamp: null, targetInternal2Timeframe: 'manual', targetInternal2EndTimestamp: null, targetInternal2EndTimeframe: 'manual' } };
  if (role === 'targetInternal3') return { entryPlan: { targetInternal3: null, targetInternal3Timestamp: null, targetInternal3Timeframe: 'manual', targetInternal3EndTimestamp: null, targetInternal3EndTimeframe: 'manual' } };
  if (role === 'target2') return { entryPlan: { targetSwing: null, targetSwingTimestamp: null, targetSwingTimeframe: 'manual', targetSwingEndTimestamp: null, targetSwingEndTimeframe: 'manual' } };
  if (role === 'target3') return { entryPlan: { targetExternal: null, targetExternalTimestamp: null, targetExternalTimeframe: 'manual', targetExternalEndTimestamp: null, targetExternalEndTimeframe: 'manual' } };
  if (role === 'targetExternal2') return { entryPlan: { targetExternal2: null, targetExternal2Timestamp: null, targetExternal2Timeframe: 'manual', targetExternal2EndTimestamp: null, targetExternal2EndTimeframe: 'manual' } };
  if (role === 'finalTarget') return { entryPlan: { finalTarget: null, finalTargetTimestamp: null, finalTargetTimeframe: 'manual', finalTargetEndTimestamp: null, finalTargetEndTimeframe: 'manual' } };
  return null;
}

function deleteOrderSetupElement(setupId, element) {
  const order = getOrderReviewById(setupId);
  const patch = getOrderSetupElementDeletePatch(element);
  if (!order || !patch) return false;
  recordHistory('Delete Order Setup Element', () => updateOrderReview(setupId, patch));
  clearOrderSetupElementSelection();
  return true;
}

function deleteOrderSetup(setupId) {
  const order = getOrderReviewById(setupId);
  if (!order) return false;
  const deleted = deleteOrderReview(setupId);
  clearOrderSetupElementSelection();
  return deleted;
}

function setOrderSetupHidden(setupId, hidden) {
  const order = getOrderReviewById(setupId);
  if (!order) return false;
  updateOrderReview(setupId, {
    display: {
      ...(order.display || {}),
      hidden,
    },
  });
  return true;
}

export function handleOrderSetupHitAction(action, context = {}) {
  if (action === 'order-setup-hit-set-active') {
    const next = setActiveReviewSet(context.orderSetupId);
    if (next) clearActiveLiveRecord();
    bus.emit('status:update', {
      text: next ? `Active Order Setup: ${context.orderSetupId}` : 'Order Setup cannot be activated',
      isError: !next,
    });
    return true;
  }

  if (action === 'order-setup-hit-hide') {
    const hidden = recordHistory('Hide Order Setup', () => setOrderSetupHidden(context.orderSetupId, true));
    bus.emit('status:update', {
      text: hidden ? `Order Setup hidden: ${context.orderSetupId}` : 'Order Setup cannot be hidden',
      isError: !hidden,
    });
    return true;
  }

  if (action === 'order-setup-hit-delete-setup') {
    const deleted = recordHistory('Delete Order Setup', () => deleteOrderSetup(context.orderSetupId));
    bus.emit('status:update', {
      text: deleted ? `Order Setup deleted: ${context.orderSetupId}` : 'Order Setup cannot be deleted',
      isError: !deleted,
    });
    return true;
  }

  if (action === 'order-setup-hit-select-element') {
    const selection = selectOrderSetupElement(context.orderSetupId, context.orderSetupElement);
    bus.emit('status:update', {
      text: selection ? `Selected ${getOrderSetupElementLabel(context.orderSetupElement)}` : 'Order Setup element cannot be selected',
      isError: !selection,
    });
    return true;
  }

  if (action === 'order-setup-hit-delete-element') {
    const deleted = deleteOrderSetupElement(context.orderSetupId, context.orderSetupElement);
    bus.emit('status:update', {
      text: deleted ? `${getOrderSetupElementLabel(context.orderSetupElement)} deleted` : 'Order Setup element cannot be deleted',
      isError: !deleted,
    });
    return true;
  }

  if (action === 'order-setup-hit-clear-active') {
    clearActiveReviewSet();
    bus.emit('status:update', { text: 'Active Order Setup closed', isError: false });
    return true;
  }

  return false;
}
