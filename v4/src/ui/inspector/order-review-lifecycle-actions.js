import * as bus from '../../event-bus.js';
import * as viewport from '../../chart/viewport-controller.js';
import {
  getActiveReviewSet,
  linkRefToActiveReviewSet,
  setActiveReviewSet,
} from '../../order/order-review-active.js';
import {
  addOrderReview,
  deleteOrderReview,
  getOrderReviewById,
  updateOrderReview,
} from '../../order/order-review-store.js';
import {
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
} from '../../order/order-review-types.js';
import {
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from '../../order/order-ref-metadata.js';
import { locateSetupSet } from '../../order/setup-set.js';
import {
  buildPdaOrderReviewRef,
  buildSegmentOrderReviewRef,
} from './order-review-reason-actions.js';
import {
  getSegmentPrice,
  getSegmentTimestamp,
} from './order-review-utils.js';

function setOrderSetupHidden(order, hidden) {
  if (!order) return;
  updateOrderReview(order.id, {
    display: {
      ...(order.display || {}),
      hidden,
    },
  });
}

export function createOrderReviewLifecycleActionController({
  getCompositeTimestamp,
  expandOrder,
  syncCalendarToOrderReview,
  refreshSelection,
  recordInspectorHistory,
} = {}) {
  function createBlankOrderReview() {
    const order = addOrderReview({
      display: {
        hidden: false,
      },
    });
    expandOrder?.(order.id);
    setActiveReviewSet(order.id);
    refreshSelection?.();
    bus.emit('status:update', { text: `已创建空白 Order Setup: ${order.id}`, isError: false });
    return order;
  }

  function createOrderReviewFromSegment(segment) {
    const timestamp = getSegmentTimestamp(segment);
    const segmentRef = buildSegmentOrderReviewRef(segment);
    const order = addOrderReview({
      setupThesis: {
        primaryEventTimestamp: timestamp,
        primaryEventTimeframe: segment.timeframe || '1H',
        primaryEventType: ORDER_EVENT_TYPES.OTHER,
        primaryEventPrice: getSegmentPrice(segment),
        linkedObjectRefs: [
          segmentRef,
        ],
      },
      entryPlan: {
        entryTimestamp: timestamp,
        entryTimeframe: segment.timeframe || '1H',
      },
      display: {
        hidden: false,
      },
    });
    expandOrder?.(order.id);
    setActiveReviewSet(order.id);
    refreshSelection?.();
    bus.emit('status:update', { text: `已创建 Order Setup: ${order.id}`, isError: false });
    return order;
  }

  function createOrderReviewFromComposite(group) {
    const timestamp = getCompositeTimestamp?.(group);
    const order = addOrderReview({
      setupThesis: {
        primaryEventTimestamp: timestamp,
        primaryEventTimeframe: '1H',
        primaryEventType: ORDER_EVENT_TYPES.OTHER,
        linkedObjectRefs: [
          {
            type: ORDER_REF_TYPES.COMPOSITE,
            id: group.id,
            role: ORDER_REF_ROLES.CONTEXT,
          },
        ],
        narrative: group.notes || '',
      },
      entryPlan: {
        entryTimestamp: timestamp,
        entryTimeframe: '1H',
      },
      display: {
        hidden: false,
      },
    });
    expandOrder?.(order.id);
    setActiveReviewSet(order.id);
    refreshSelection?.();
    bus.emit('status:update', { text: `已创建 Order Setup: ${order.id}`, isError: false });
    return order;
  }

  function locateOrderReview(order) {
    if (!locateSetupSet(order?.id, viewport.locateTimestampRange)) {
      bus.emit('status:update', { text: '该 Order Setup 没有可定位时间', isError: true });
    }
  }

  function linkSegmentToActiveSetup(segment) {
    const active = getActiveReviewSet();
    if (!active?.orderReview) {
      bus.emit('status:update', { text: '没有 active setup 可链接', isError: true });
      return true;
    }
    recordInspectorHistory?.('Link Segment To Active Setup', () =>
      linkRefToActiveReviewSet(buildSegmentOrderReviewRef(segment))
    );
    bus.emit('status:update', {
      text: `${getSegmentOrderRefLabel(segment)} linked to active setup`,
      isError: false,
    });
    refreshSelection?.();
    return true;
  }

  function linkPdaToActiveSetup(annotation) {
    const active = getActiveReviewSet();
    if (!active?.orderReview) {
      bus.emit('status:update', { text: '没有 active setup 可链接', isError: true });
      return true;
    }
    recordInspectorHistory?.('Link PDA To Active Setup', () =>
      linkRefToActiveReviewSet(buildPdaOrderReviewRef(annotation))
    );
    bus.emit('status:update', {
      text: `${getPdaOrderRefLabel(annotation)} linked to active setup`,
      isError: false,
    });
    refreshSelection?.();
    return true;
  }

  function handleClick(action, actionEl, context = {}) {
    if (action === 'order-review-create-empty') {
      recordInspectorHistory?.('Create Order Setup', () => createBlankOrderReview());
      return true;
    }

    if (action === 'order-review-create-segment' && context.segment) {
      recordInspectorHistory?.('Create Order Setup', () => createOrderReviewFromSegment(context.segment));
      return true;
    }

    if (action === 'order-review-create-composite' && context.segmentGroup) {
      recordInspectorHistory?.('Create Order Setup', () => createOrderReviewFromComposite(context.segmentGroup));
      return true;
    }

    if (action === 'segment-link-active-setup' && context.segment) {
      return linkSegmentToActiveSetup(context.segment);
    }

    if (action === 'pda-link-active-setup' && context.annotation) {
      return linkPdaToActiveSetup(context.annotation);
    }

    if (action === 'order-review-locate') {
      const order = getOrderReviewById(actionEl.dataset.orderReviewId);
      if (order) locateOrderReview(order);
      return true;
    }

    if (action === 'order-review-toggle-hidden') {
      const order = getOrderReviewById(actionEl.dataset.orderReviewId);
      if (!order) return true;
      const hidden = !order.display?.hidden;
      recordInspectorHistory?.(hidden ? 'Hide Order Setup' : 'Show Order Setup', () => {
        setOrderSetupHidden(order, hidden);
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'order-review-delete') {
      recordInspectorHistory?.('Delete Order Setup', () => deleteOrderReview(actionEl.dataset.orderReviewId));
      return true;
    }

    if (action === 'order-review-set-active') {
      setActiveReviewSet(actionEl.dataset.orderReviewId);
      syncCalendarToOrderReview?.(actionEl.dataset.orderReviewId);
      expandOrder?.(actionEl.dataset.orderReviewId);
      refreshSelection?.();
      return true;
    }

    return false;
  }

  return {
    createOrderReviewFromComposite,
    createOrderReviewFromSegment,
    handleClick,
  };
}
