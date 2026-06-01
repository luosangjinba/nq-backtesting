import * as bus from '../../event-bus.js';
import * as viewport from '../../chart/viewport-controller.js';
import * as secondaryViewport from '../../chart/secondary-viewport-controller.js';
import { getAnnotationById } from '../../pda/pda-store.js';
import { getSelectedPda } from '../../pda/pda-selection.js';
import { getSelectedSegment, getSelectedSegmentGroup } from '../../segment/segment-selection.js';
import { getSegmentById } from '../../segment/segment-store.js';
import {
  clearActiveReviewSet,
  getActiveReviewSet,
  linkRefToActiveReviewSet,
  setActiveReviewSet,
} from '../../order/order-review-active.js';
import {
  clearOrderSetupElementSelection,
  selectOrderSetupElement,
} from '../../order/order-setup-selection.js';
import {
  addOrderReview,
  deleteOrderReview,
  getOrderReviewById,
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
  updateOrderReview,
} from '../../order/order-review-store.js';
import {
  buildPdaOrderRefMetadata,
  buildSegmentOrderRefMetadata,
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from '../../order/order-ref-metadata.js';
import { locateSetupSet } from '../../order/setup-set.js';
import { getSmtRecordById } from '../../smt/smt-store.js';
import { recordHistory } from '../../history/history-manager.js';

function getSegmentTimestamp(segment) {
  return segment?.end?.timestamp ?? segment?.end?.time ?? segment?.start?.timestamp ?? segment?.start?.time ?? null;
}

function getSegmentPrice(segment) {
  return segment?.end?.price ?? segment?.start?.price ?? null;
}

function asTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getPointTimestamp(point = {}) {
  return asTimestamp(point.canonicalTimestamp ?? point.timestamp ?? point.anchorTime ?? point.time);
}

function getAnnotationTimestampRange(annotation = {}) {
  const pointTimestamps = Array.isArray(annotation.points)
    ? annotation.points.map(getPointTimestamp).filter((timestamp) => timestamp !== null)
    : [];
  if (pointTimestamps.length) {
    return {
      start: Math.min(...pointTimestamps),
      end: Math.max(...pointTimestamps),
    };
  }

  const startCandidates = [
    annotation.startTimeTimestamp,
    annotation.start?.timestamp,
    annotation.start?.time,
    annotation.startTime,
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
  ];
  const endCandidates = [
    annotation.endTimeTimestamp,
    annotation.end?.timestamp,
    annotation.end?.time,
    annotation.endTime,
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
  ];
  const start = startCandidates.map(asTimestamp).find((timestamp) => timestamp !== null);
  const end = endCandidates.map(asTimestamp).find((timestamp) => timestamp !== null);
  if (start === null || end === null) return null;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function getSegmentTimestampRange(segment = {}) {
  const start = asTimestamp(segment.start?.timestamp ?? segment.start?.time);
  const end = asTimestamp(segment.end?.timestamp ?? segment.end?.time);
  if (start === null || end === null) return null;
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function parseOrderReviewFieldValue(target) {
  const field = target.dataset.orderReviewField;
  if (field === 'entryPatterns') {
    const container = target.closest('.order-entry-patterns');
    return Array.from(container?.querySelectorAll('input[data-order-entry-pattern]:checked') || [])
      .map((input) => input.dataset.orderEntryPattern)
      .filter(Boolean);
  }
  if (target.type === 'checkbox') return target.checked;
  return target.value;
}

function recordInspectorHistory(label, mutator) {
  return recordHistory(label, mutator);
}

function getOrderReviewRefs(order) {
  return Array.isArray(order?.setupThesis?.linkedObjectRefs) ? order.setupThesis.linkedObjectRefs : [];
}

function getOrderReviewReasons(order) {
  const reasons = Array.isArray(order?.setupThesis?.reasons) ? order.setupThesis.reasons : [];
  if (reasons.length) {
    return reasons.map((reason, index) => ({
      id: reason.id || `reason_${index + 1}`,
      note: reason.note || '',
      refs: Array.isArray(reason.refs) ? reason.refs : [],
    }));
  }
  const refs = getOrderReviewRefs(order);
  const note = order?.setupThesis?.narrative || '';
  return [{ id: 'reason_1', note, refs }];
}

function isOrderReviewReasonEmpty(reason = {}) {
  return !reason.note && !(Array.isArray(reason.refs) && reason.refs.length);
}

function createOrderReviewReasonId() {
  return `reason_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function setOrderSetupHidden(order, hidden) {
  if (!order) return;
  updateOrderReview(order.id, {
    display: {
      ...(order.display || {}),
      hidden,
    },
  });
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

export function buildPdaOrderReviewRef(annotation) {
  return {
    type: ORDER_REF_TYPES.PDA,
    id: annotation.id,
    role: ORDER_REF_ROLES.CONTEXT,
    ...buildPdaOrderRefMetadata(annotation),
  };
}

export function buildSegmentOrderReviewRef(segment) {
  return {
    type: ORDER_REF_TYPES.SEGMENT,
    id: segment.id,
    role: ORDER_REF_ROLES.CONTEXT,
    ...buildSegmentOrderRefMetadata(segment),
  };
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

  function patchOrderReviewReasons(orderReviewId, reasons) {
    const normalizedReasons = reasons.map((reason, index) => ({
      id: reason.id || `reason_${index + 1}`,
      note: reason.note || '',
      refs: Array.isArray(reason.refs) ? reason.refs : [],
    }));
    const firstReason = normalizedReasons[0] || { note: '', refs: [] };
    expandOrder(orderReviewId);
    recordInspectorHistory('Update Order Reasons', () => updateOrderReview(orderReviewId, {
      setupThesis: {
        reasons: normalizedReasons,
        narrative: firstReason.note || '',
        linkedObjectRefs: firstReason.refs || [],
      },
    }));
  }

  function patchOrderReviewRefs(orderReviewId, refs) {
    expandOrder(orderReviewId);
    recordInspectorHistory('Update Order Refs', () => updateOrderReview(orderReviewId, {
      setupThesis: {
        linkedObjectRefs: refs,
      },
    }));
  }

  function addOrderReviewRef(orderReviewId, ref) {
    const order = getOrderReviewById(orderReviewId);
    if (!order || !ref?.type || !ref?.id) return false;
    patchOrderReviewRefs(orderReviewId, [...getOrderReviewRefs(order), ref]);
    return true;
  }

  function addOrderReviewReasonRef(orderReviewId, reasonIndex, ref) {
    const order = getOrderReviewById(orderReviewId);
    if (!order || !ref?.type || !ref?.id) return false;
    const reasons = getOrderReviewReasons(order);
    const index = Number.isInteger(reasonIndex) && reasonIndex >= 0 ? reasonIndex : 0;
    while (reasons.length <= index) {
      reasons.push({ id: createOrderReviewReasonId(), note: '', refs: [] });
    }
    const refs = Array.isArray(reasons[index].refs) ? reasons[index].refs : [];
    const key = `${ref.type}:${ref.id}:${ref.role}`;
    if (refs.some((existing) => `${existing.type}:${existing.id}:${existing.role}` === key)) return false;
    reasons[index] = { ...reasons[index], refs: [...refs, ref] };
    patchOrderReviewReasons(orderReviewId, reasons);
    return true;
  }

  function updateOrderReviewReasonNote(orderReviewId, reasonIndex, note) {
    const order = getOrderReviewById(orderReviewId);
    if (!order) return false;
    const reasons = getOrderReviewReasons(order);
    const index = Number.isInteger(reasonIndex) && reasonIndex >= 0 ? reasonIndex : 0;
    while (reasons.length <= index) {
      reasons.push({ id: createOrderReviewReasonId(), note: '', refs: [] });
    }
    reasons[index] = { ...reasons[index], note };
    patchOrderReviewReasons(orderReviewId, reasons);
    return true;
  }

  function addOrderReviewReason(orderReviewId) {
    const order = getOrderReviewById(orderReviewId);
    if (!order) return false;
    patchOrderReviewReasons(orderReviewId, [
      ...getOrderReviewReasons(order),
      { id: createOrderReviewReasonId(), note: '', refs: [] },
    ]);
    return true;
  }

  function deleteOrderReviewReason(orderReviewId, reasonIndex) {
    const order = getOrderReviewById(orderReviewId);
    const reasons = getOrderReviewReasons(order);
    if (!order || reasonIndex <= 0 || reasonIndex >= reasons.length) return false;
    if (!isOrderReviewReasonEmpty(reasons[reasonIndex])) {
      bus.emit('status:update', { text: 'Only empty extra reasons can be deleted', isError: true });
      return true;
    }
    patchOrderReviewReasons(
      orderReviewId,
      reasons.filter((_, index) => index !== reasonIndex)
    );
    return true;
  }

  function removeOrderReviewRef(orderReviewId, refIndex) {
    const order = getOrderReviewById(orderReviewId);
    const refs = getOrderReviewRefs(order);
    if (!order || refIndex < 0 || refIndex >= refs.length) return false;
    patchOrderReviewRefs(
      orderReviewId,
      refs.filter((_, index) => index !== refIndex)
    );
    return true;
  }

  function removeOrderReviewReasonRef(orderReviewId, reasonIndex, refIndex) {
    const order = getOrderReviewById(orderReviewId);
    const reasons = getOrderReviewReasons(order);
    if (!order || reasonIndex < 0 || reasonIndex >= reasons.length) return false;
    const refs = Array.isArray(reasons[reasonIndex].refs) ? reasons[reasonIndex].refs : [];
    if (refIndex < 0 || refIndex >= refs.length) return false;
    reasons[reasonIndex] = {
      ...reasons[reasonIndex],
      refs: refs.filter((_, index) => index !== refIndex),
    };
    patchOrderReviewReasons(orderReviewId, reasons);
    return true;
  }

  function getSelectedOrderReviewRef() {
    const pdaSelection = getSelectedPda();
    if (pdaSelection) {
      const annotation = getAnnotationById(pdaSelection.id);
      if (!annotation) return { error: '选中的 PDA 不存在' };
      return { ref: buildPdaOrderReviewRef(annotation), label: getPdaOrderRefLabel(annotation) };
    }

    const segmentSelection = getSelectedSegment();
    if (segmentSelection) {
      const segment = getSegmentById(segmentSelection.id);
      if (!segment) return { error: '选中的 Segment 不存在' };
      return { ref: buildSegmentOrderReviewRef(segment), label: getSegmentOrderRefLabel(segment) };
    }

    const compositeSelection = getSelectedSegmentGroup();
    if (compositeSelection) {
      return {
        ref: {
          type: ORDER_REF_TYPES.COMPOSITE,
          id: compositeSelection.id,
          role: ORDER_REF_ROLES.CONTEXT,
        },
        label: 'Composite Move',
      };
    }

    const selectedSmtId = getSelectedSmtId();
    if (selectedSmtId && getSmtRecordById(selectedSmtId)) {
      return {
        ref: {
          type: ORDER_REF_TYPES.SMT,
          id: selectedSmtId,
          role: ORDER_REF_ROLES.CONFIRMATION,
        },
        label: 'SMT',
      };
    }

    return { error: '没有选中的 PDA / Segment / Composite / SMT' };
  }

  function addSelectedOrderReviewRef(action, orderReviewId, reasonIndex = 0) {
    if (action === 'order-review-ref-add-selected-object') {
      const selected = getSelectedOrderReviewRef();
      if (selected.error) {
        bus.emit('status:update', { text: selected.error, isError: true });
        return true;
      }
      const added = addOrderReviewReasonRef(orderReviewId, reasonIndex, selected.ref);
      bus.emit('status:update', {
        text: added ? `${selected.label} linked to Reason ${reasonIndex + 1}` : 'Link selected object failed',
        isError: !added,
      });
      return true;
    }

    if (action === 'order-review-ref-add-selected-pda') {
      const selection = getSelectedPda();
      if (!selection) {
        bus.emit('status:update', { text: '没有选中的 PDA', isError: true });
        return true;
      }
      const annotation = getAnnotationById(selection.id);
      if (!annotation) {
        bus.emit('status:update', { text: '选中的 PDA 不存在', isError: true });
        return true;
      }
      addOrderReviewRef(orderReviewId, buildPdaOrderReviewRef(annotation));
      return true;
    }

    if (action === 'order-review-ref-add-selected-segment') {
      const selection = getSelectedSegment();
      if (!selection) {
        bus.emit('status:update', { text: '没有选中的 Segment', isError: true });
        return true;
      }
      const segment = getSegmentById(selection.id);
      if (!segment) {
        bus.emit('status:update', { text: '选中的 Segment 不存在', isError: true });
        return true;
      }
      addOrderReviewRef(orderReviewId, buildSegmentOrderReviewRef(segment));
      return true;
    }

    if (action === 'order-review-ref-add-selected-composite') {
      const selection = getSelectedSegmentGroup();
      if (!selection) {
        bus.emit('status:update', { text: '没有选中的 Composite Move', isError: true });
        return true;
      }
      addOrderReviewRef(orderReviewId, {
        type: ORDER_REF_TYPES.COMPOSITE,
        id: selection.id,
        role: ORDER_REF_ROLES.CONTEXT,
      });
      return true;
    }

    if (action === 'order-review-ref-add-selected-smt') {
      const selectedSmtId = getSelectedSmtId();
      if (!selectedSmtId || !getSmtRecordById(selectedSmtId)) {
        bus.emit('status:update', { text: '没有选中的 SMT', isError: true });
        return true;
      }
      addOrderReviewRef(orderReviewId, {
        type: ORDER_REF_TYPES.SMT,
        id: selectedSmtId,
        role: ORDER_REF_ROLES.CONFIRMATION,
      });
      return true;
    }

    return false;
  }

  function createBlankOrderReview() {
    const order = addOrderReview({
      display: {
        hidden: false,
      },
    });
    expandOrder(order.id);
    setActiveReviewSet(order.id);
    refreshSelection();
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
    expandOrder(order.id);
    setActiveReviewSet(order.id);
    refreshSelection();
    bus.emit('status:update', { text: `已创建 Order Setup: ${order.id}`, isError: false });
    return order;
  }

  function createOrderReviewFromComposite(group) {
    const timestamp = getCompositeTimestamp(group);
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
    expandOrder(order.id);
    setActiveReviewSet(order.id);
    refreshSelection();
    bus.emit('status:update', { text: `已创建 Order Setup: ${order.id}`, isError: false });
    return order;
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

  function locateOrderReview(order) {
    if (!locateSetupSet(order?.id, viewport.locateTimestampRange)) {
      bus.emit('status:update', { text: '该 Order Setup 没有可定位时间', isError: true });
      return;
    }
  }

  function getOrderReviewReasonRef(orderReviewId, reasonIndex, refIndex) {
    const order = getOrderReviewById(orderReviewId);
    const reasons = getOrderReviewReasons(order);
    const index = Number.isInteger(reasonIndex) && reasonIndex >= 0 ? reasonIndex : 0;
    const refs = Array.isArray(reasons[index]?.refs) ? reasons[index].refs : [];
    return refs[refIndex] || null;
  }

  function locateOrderReviewRef(ref) {
    const type = String(ref?.type || ref?.refType || '').toLowerCase();
    let range = null;
    let sourceChartId = ref?.sourceChartId || 'primary';
    let label = 'linked object';

    if (type === ORDER_REF_TYPES.PDA) {
      const annotation = getAnnotationById(ref.id || ref.refId);
      if (!annotation) {
        bus.emit('status:update', { text: 'Linked PDA not found', isError: true });
        return true;
      }
      range = getAnnotationTimestampRange(annotation);
      sourceChartId = ref.sourceChartId || annotation.sourceChartId || sourceChartId;
      label = getPdaOrderRefLabel(annotation);
    } else if (type === ORDER_REF_TYPES.SEGMENT) {
      const segment = getSegmentById(ref.id || ref.refId);
      if (!segment) {
        bus.emit('status:update', { text: 'Linked segment not found', isError: true });
        return true;
      }
      range = getSegmentTimestampRange(segment);
      sourceChartId = ref.sourceChartId || segment.sourceChartId || sourceChartId;
      label = getSegmentOrderRefLabel(segment);
    }

    if (!range) {
      bus.emit('status:update', { text: 'Linked object has no locatable time range', isError: true });
      return true;
    }

    const useSecondary = sourceChartId === 'secondary';
    const located = useSecondary
      ? secondaryViewport.locateSecondaryTimestampRange(range.start, range.end)
      : (viewport.locateTimestampRange(range.start, range.end), true);
    if (!located) {
      bus.emit('status:update', { text: 'Secondary chart is not available for this linked object', isError: true });
      return true;
    }
    bus.emit('status:update', { text: `Located ${label}`, isError: false });
    return true;
  }

  function linkSegmentToActiveSetup(segment) {
    const active = getActiveReviewSet();
    if (!active?.orderReview) {
      bus.emit('status:update', { text: '没有 active setup 可链接', isError: true });
      return true;
    }
    recordInspectorHistory('Link Segment To Active Setup', () =>
      linkRefToActiveReviewSet(buildSegmentOrderReviewRef(segment))
    );
    bus.emit('status:update', {
      text: `${getSegmentOrderRefLabel(segment)} linked to active setup`,
      isError: false,
    });
    refreshSelection();
    return true;
  }

  function linkPdaToActiveSetup(annotation) {
    const active = getActiveReviewSet();
    if (!active?.orderReview) {
      bus.emit('status:update', { text: '没有 active setup 可链接', isError: true });
      return true;
    }
    recordInspectorHistory('Link PDA To Active Setup', () =>
      linkRefToActiveReviewSet(buildPdaOrderReviewRef(annotation))
    );
    bus.emit('status:update', {
      text: `${getPdaOrderRefLabel(annotation)} linked to active setup`,
      isError: false,
    });
    refreshSelection();
    return true;
  }

  function handleOrderReviewChange(action, target) {
    if (action === 'order-review-note') {
      recordInspectorHistory('Update Order Note', () =>
        updateOrderReview(target.dataset.orderReviewId, { note: target.value })
      );
      return true;
    }

    if (action === 'order-review-result') {
      recordInspectorHistory('Update Order Result', () => updateOrderReview(target.dataset.orderReviewId, {
        resultReview: { result: target.value },
      }));
      return true;
    }

    if (action === 'order-review-reason-note') {
      updateOrderReviewReasonNote(
        target.dataset.orderReviewId,
        Number(target.dataset.reasonIndex),
        target.value
      );
      return true;
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

    if (action === 'order-review-ref-remove') {
      const reasonIndex = Number(target.dataset.reasonIndex);
      if (Number.isFinite(reasonIndex)) {
        removeOrderReviewReasonRef(target.dataset.orderReviewId, reasonIndex, Number(target.dataset.refIndex));
      } else {
        removeOrderReviewRef(target.dataset.orderReviewId, Number(target.dataset.refIndex));
      }
      return true;
    }

    if (action === 'order-review-ref-locate') {
      const reasonIndex = Number(target.dataset.reasonIndex);
      const refIndex = Number(target.dataset.refIndex);
      const ref = getOrderReviewReasonRef(target.dataset.orderReviewId, reasonIndex, refIndex);
      if (ref) locateOrderReviewRef(ref);
      return true;
    }

    if (action.startsWith('order-review-ref-add-selected-')) {
      addSelectedOrderReviewRef(action, target.dataset.orderReviewId, Number(target.dataset.reasonIndex) || 0);
      return true;
    }

    return false;
  }

  function handleOrderReviewClick(action, actionEl, context = {}) {
    if (action === 'order-review-create-empty') {
      recordInspectorHistory('Create Order Setup', () => createBlankOrderReview());
      return true;
    }

    if (action === 'order-review-create-segment' && context.segment) {
      recordInspectorHistory('Create Order Setup', () => createOrderReviewFromSegment(context.segment));
      return true;
    }

    if (action === 'order-review-create-composite' && context.segmentGroup) {
      recordInspectorHistory('Create Order Setup', () => createOrderReviewFromComposite(context.segmentGroup));
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
      recordInspectorHistory(hidden ? 'Hide Order Setup' : 'Show Order Setup', () => {
        setOrderSetupHidden(order, hidden);
      });
      refreshSelection();
      return true;
    }

    if (action === 'order-review-delete') {
      recordInspectorHistory('Delete Order Setup', () => deleteOrderReview(actionEl.dataset.orderReviewId));
      return true;
    }

    if (action === 'order-review-set-active') {
      setActiveReviewSet(actionEl.dataset.orderReviewId);
      syncCalendarToOrderReview(actionEl.dataset.orderReviewId);
      expandOrder(actionEl.dataset.orderReviewId);
      refreshSelection();
      return true;
    }

    if (action === 'order-review-clear-active') {
      clearActiveReviewSet();
      clearOrderSetupElementSelection();
      refreshSelection();
      return true;
    }

    if (action === 'order-review-reason-add') {
      addOrderReviewReason(actionEl.dataset.orderReviewId);
      refreshSelection();
      return true;
    }

    if (action === 'order-review-reason-delete') {
      deleteOrderReviewReason(actionEl.dataset.orderReviewId, Number(actionEl.dataset.reasonIndex));
      refreshSelection();
      return true;
    }

    if (action === 'order-review-ref-remove') {
      const reasonIndex = Number(actionEl.dataset.reasonIndex);
      if (Number.isFinite(reasonIndex)) {
        removeOrderReviewReasonRef(actionEl.dataset.orderReviewId, reasonIndex, Number(actionEl.dataset.refIndex));
      } else {
        removeOrderReviewRef(actionEl.dataset.orderReviewId, Number(actionEl.dataset.refIndex));
      }
      refreshSelection();
      return true;
    }

    if (action === 'order-review-ref-locate') {
      const reasonIndex = Number(actionEl.dataset.reasonIndex);
      const refIndex = Number(actionEl.dataset.refIndex);
      const ref = getOrderReviewReasonRef(actionEl.dataset.orderReviewId, reasonIndex, refIndex);
      if (ref) locateOrderReviewRef(ref);
      return true;
    }

    if (action.startsWith('order-review-ref-add-selected-')) {
      addSelectedOrderReviewRef(action, actionEl.dataset.orderReviewId, Number(actionEl.dataset.reasonIndex) || 0);
      refreshSelection();
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

  return {
    createOrderReviewFromComposite,
    createOrderReviewFromSegment,
    handleOrderReviewChange,
    handleOrderReviewClick,
    getExpandedOrderReviewId,
  };
}
