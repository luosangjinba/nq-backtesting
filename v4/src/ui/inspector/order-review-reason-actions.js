import * as bus from '../../event-bus.js';
import * as viewport from '../../chart/viewport-controller.js';
import * as secondaryViewport from '../../chart/secondary-viewport-controller.js';
import { getAnnotationById } from '../../pda/pda-store.js';
import { locatePdaProjection } from '../../pda/pda-locate-actions.js';
import { getSelectedPda } from '../../pda/pda-selection.js';
import { getChartNoteById } from '../../chart-notes/chart-note-store.js';
import { flashChartNote } from '../../chart-notes/chart-note-renderer.js';
import { getSelectedSegment, getSelectedSegmentGroup } from '../../segment/segment-selection.js';
import { getSegmentById } from '../../segment/segment-store.js';
import {
  getOrderReviewById,
  normalizeEnum,
  ORDER_REASON_CATEGORIES,
  ORDER_REASON_CATEGORY_ALIASES,
  updateOrderReview,
  VALID_ORDER_REASON_CATEGORIES,
} from '../../order/order-review-store.js';
import {
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
} from '../../order/order-review-types.js';
import {
  buildPdaOrderRefMetadata,
  buildChartNoteOrderRefMetadata,
  buildSegmentOrderRefMetadata,
  getChartNoteOrderRefLabel,
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from '../../order/order-ref-metadata.js';
import { getSmtRecordById } from '../../smt/smt-store.js';
import {
  getAnnotationTimestampRange,
  getSegmentTimestampRange,
} from './order-review-utils.js';

let pendingOrderReasonRefPick = null;

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

export function buildChartNoteOrderReviewRef(note) {
  return {
    type: ORDER_REF_TYPES.CHART_NOTE,
    id: note.id,
    role: ORDER_REF_ROLES.CONTEXT,
    ...buildChartNoteOrderRefMetadata(note),
  };
}

export function getOrderReviewRefs(order) {
  return Array.isArray(order?.setupThesis?.linkedObjectRefs) ? order.setupThesis.linkedObjectRefs : [];
}

export function getOrderReviewReasons(order) {
  const reasons = Array.isArray(order?.setupThesis?.reasons) ? order.setupThesis.reasons : [];
  if (reasons.length) {
    return reasons.map((reason, index) => ({
      id: reason.id || `reason_${index + 1}`,
      category: normalizeReasonCategory(reason.category ?? reason.type),
      note: reason.note || '',
      refs: Array.isArray(reason.refs) ? reason.refs : [],
    }));
  }
  const refs = getOrderReviewRefs(order);
  const note = order?.setupThesis?.narrative || '';
  return [{ id: 'reason_1', category: ORDER_REASON_CATEGORIES.OTHER, note, refs }];
}

export function getPendingOrderReasonRefPick() {
  return pendingOrderReasonRefPick;
}

function setPendingOrderReasonRefPick(nextPick) {
  pendingOrderReasonRefPick = nextPick || null;
  return pendingOrderReasonRefPick;
}

export function clearPendingOrderReasonRefPick(options = {}) {
  pendingOrderReasonRefPick = null;
  if (!options.silent) {
    bus.emit('status:update', { text: 'Order reason object selection cancelled', isError: false });
  }
}

export function hasPendingOrderReasonRefPick() {
  return Boolean(pendingOrderReasonRefPick);
}

function createOrderReviewReasonId() {
  return `reason_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyOrderReviewReason() {
  return {
    id: createOrderReviewReasonId(),
    category: ORDER_REASON_CATEGORIES.OTHER,
    note: '',
    refs: [],
  };
}

function normalizeReasonCategory(value) {
  return normalizeEnum(
    value,
    VALID_ORDER_REASON_CATEGORIES,
    ORDER_REASON_CATEGORY_ALIASES,
    ORDER_REASON_CATEGORIES.OTHER
  );
}

export function createOrderReviewReasonActionController({
  getSelectedSmtId,
  expandOrder,
  refreshSelection,
  recordInspectorHistory,
} = {}) {
  function patchOrderReviewReasons(orderReviewId, reasons) {
    const normalizedReasons = reasons.map((reason, index) => ({
      id: reason.id || `reason_${index + 1}`,
      category: normalizeReasonCategory(reason.category ?? reason.type),
      note: reason.note || '',
      refs: Array.isArray(reason.refs) ? reason.refs : [],
    }));
    const firstReason = normalizedReasons[0] || { note: '', refs: [] };
    expandOrder?.(orderReviewId);
    recordInspectorHistory?.('Update Order Reasons', () => updateOrderReview(orderReviewId, {
      setupThesis: {
        reasons: normalizedReasons,
        narrative: firstReason.note || '',
        linkedObjectRefs: firstReason.refs || [],
      },
    }));
  }

  function patchOrderReviewRefs(orderReviewId, refs) {
    expandOrder?.(orderReviewId);
    recordInspectorHistory?.('Update Order Refs', () => updateOrderReview(orderReviewId, {
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
      reasons.push(createEmptyOrderReviewReason());
    }
    const refs = Array.isArray(reasons[index].refs) ? reasons[index].refs : [];
    const key = `${ref.type}:${ref.id}:${ref.role}`;
    if (refs.some((existing) => `${existing.type}:${existing.id}:${existing.role}` === key)) return false;
    reasons[index] = { ...reasons[index], refs: [...refs, ref] };
    patchOrderReviewReasons(orderReviewId, reasons);
    return true;
  }

  function startReasonRefPick(actionEl) {
    const orderReviewId = actionEl.dataset.orderReviewId;
    const reasonIndex = Number(actionEl.dataset.reasonIndex) || 0;
    if (!getOrderReviewById(orderReviewId)) {
      bus.emit('status:update', { text: 'Order Setup not found', isError: true });
      return true;
    }
    setPendingOrderReasonRefPick({ orderReviewId, reasonIndex });
    bus.emit('status:update', {
      text: `Select a chart object to link to Reason ${reasonIndex + 1}`,
      isError: false,
    });
    refreshSelection?.();
    return true;
  }

  function cancelReasonRefPick() {
    clearPendingOrderReasonRefPick();
    refreshSelection?.();
    return true;
  }

  function linkPickedReasonRef(ref, label = 'Object') {
    const pendingPick = getPendingOrderReasonRefPick();
    if (!pendingPick || !ref?.type || !ref?.id) return false;
    const added = addOrderReviewReasonRef(pendingPick.orderReviewId, pendingPick.reasonIndex, ref);
    clearPendingOrderReasonRefPick({ silent: true });
    bus.emit('status:update', {
      text: added
        ? `${label} linked to Reason ${pendingPick.reasonIndex + 1}`
        : 'Link selected object failed',
      isError: !added,
    });
    refreshSelection?.();
    return added;
  }

  function updateOrderReviewReasonNote(orderReviewId, reasonIndex, note) {
    const order = getOrderReviewById(orderReviewId);
    if (!order) return false;
    const reasons = getOrderReviewReasons(order);
    const index = Number.isInteger(reasonIndex) && reasonIndex >= 0 ? reasonIndex : 0;
    while (reasons.length <= index) {
      reasons.push(createEmptyOrderReviewReason());
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
      createEmptyOrderReviewReason(),
    ]);
    return true;
  }

  function updateOrderReviewReasonCategory(orderReviewId, reasonIndex, category) {
    const order = getOrderReviewById(orderReviewId);
    if (!order) return false;
    const reasons = getOrderReviewReasons(order);
    const index = Number.isInteger(reasonIndex) && reasonIndex >= 0 ? reasonIndex : 0;
    while (reasons.length <= index) {
      reasons.push(createEmptyOrderReviewReason());
    }
    reasons[index] = { ...reasons[index], category: normalizeReasonCategory(category) };
    patchOrderReviewReasons(orderReviewId, reasons);
    return true;
  }

  function deleteOrderReviewReason(orderReviewId, reasonIndex) {
    const order = getOrderReviewById(orderReviewId);
    const reasons = getOrderReviewReasons(order);
    if (!order || reasonIndex < 0 || reasonIndex >= reasons.length) return false;
    const nextReasons = reasons.filter((_, index) => index !== reasonIndex);
    patchOrderReviewReasons(
      orderReviewId,
      nextReasons.length ? nextReasons : [createEmptyOrderReviewReason()]
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

    const selectedSmtId = getSelectedSmtId?.();
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
      const selectedSmtId = getSelectedSmtId?.();
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
    let annotation = null;

    if (type === ORDER_REF_TYPES.PDA) {
      annotation = getAnnotationById(ref.id || ref.refId);
      if (!annotation) {
        bus.emit('status:update', { text: 'Linked PDA not found', isError: true });
        return true;
      }
      range = getAnnotationTimestampRange(annotation);
      sourceChartId = ref.sourceChartId || annotation.sourceChartId || sourceChartId;
      label = getPdaOrderRefLabel(annotation);
      const result = locatePdaProjection(annotation);
      bus.emit('status:update', {
        text: result.primary.located && result.secondary.located
          ? `Located ${label} on primary and secondary`
          : result.primary.located
            ? `Located ${label} on primary`
            : result.secondary.located
              ? `Located ${label} on secondary`
              : `${label} has no locatable loaded chart`,
        isError: !result.located,
      });
      return true;
    } else if (type === ORDER_REF_TYPES.SEGMENT) {
      const segment = getSegmentById(ref.id || ref.refId);
      if (!segment) {
        bus.emit('status:update', { text: 'Linked segment not found', isError: true });
        return true;
      }
      range = getSegmentTimestampRange(segment);
      sourceChartId = ref.sourceChartId || segment.sourceChartId || sourceChartId;
      label = getSegmentOrderRefLabel(segment);
    } else if (type === ORDER_REF_TYPES.CHART_NOTE) {
      const note = getChartNoteById(ref.id || ref.refId);
      if (!note) {
        bus.emit('status:update', { text: 'Linked Chart Note not found', isError: true });
        return true;
      }
      const located = viewport.locateTimestampRange(note.timestamp, note.timestamp, { flash: false });
      const flashed = located && flashChartNote(note.id);
      bus.emit('status:update', {
        text: flashed
          ? `Located ${getChartNoteOrderRefLabel(note)}`
          : 'Chart Note box is not visible on the current chart/timeframe',
        isError: !flashed,
      });
      return true;
    }

    if (!range) {
      bus.emit('status:update', { text: 'Linked object has no locatable time range', isError: true });
      return true;
    }

    const useSecondary = sourceChartId === 'secondary';
    const located = useSecondary
      ? secondaryViewport.locateSecondaryTimestampRange(range.start, range.end)
      : viewport.locateTimestampRange(range.start, range.end);
    if (!located) {
      bus.emit('status:update', {
        text: useSecondary
          ? 'Secondary chart is not available for this linked object'
          : 'Primary chart cannot locate this linked object',
        isError: true,
      });
      return true;
    }

    bus.emit('status:update', { text: `Located ${label}`, isError: false });
    return true;
  }

  function removeRefFromTarget(target) {
    const reasonIndex = Number(target.dataset.reasonIndex);
    if (Number.isFinite(reasonIndex)) {
      removeOrderReviewReasonRef(target.dataset.orderReviewId, reasonIndex, Number(target.dataset.refIndex));
    } else {
      removeOrderReviewRef(target.dataset.orderReviewId, Number(target.dataset.refIndex));
    }
  }

  function locateRefFromTarget(target) {
    const reasonIndex = Number(target.dataset.reasonIndex);
    const refIndex = Number(target.dataset.refIndex);
    const ref = getOrderReviewReasonRef(target.dataset.orderReviewId, reasonIndex, refIndex);
    if (ref) locateOrderReviewRef(ref);
  }

  function handleChange(action, target) {
    if (action === 'order-review-reason-note') {
      updateOrderReviewReasonNote(
        target.dataset.orderReviewId,
        Number(target.dataset.reasonIndex),
        target.value
      );
      return true;
    }

    if (action === 'order-review-reason-category') {
      updateOrderReviewReasonCategory(
        target.dataset.orderReviewId,
        Number(target.dataset.reasonIndex),
        target.value
      );
      return true;
    }

    if (action === 'order-review-ref-remove') {
      removeRefFromTarget(target);
      return true;
    }

    if (action === 'order-review-ref-locate') {
      locateRefFromTarget(target);
      return true;
    }

    if (action.startsWith('order-review-ref-add-selected-')) {
      addSelectedOrderReviewRef(action, target.dataset.orderReviewId, Number(target.dataset.reasonIndex) || 0);
      return true;
    }

    return false;
  }

  function handleClick(action, actionEl) {
    if (action === 'order-review-ref-pick-start') {
      return startReasonRefPick(actionEl);
    }

    if (action === 'order-review-ref-pick-cancel') {
      return cancelReasonRefPick();
    }

    if (action === 'order-review-reason-add') {
      addOrderReviewReason(actionEl.dataset.orderReviewId);
      refreshSelection?.();
      return true;
    }

    if (action === 'order-review-reason-delete') {
      deleteOrderReviewReason(actionEl.dataset.orderReviewId, Number(actionEl.dataset.reasonIndex));
      refreshSelection?.();
      return true;
    }

    if (action === 'order-review-ref-remove') {
      removeRefFromTarget(actionEl);
      refreshSelection?.();
      return true;
    }

    if (action === 'order-review-ref-locate') {
      locateRefFromTarget(actionEl);
      return true;
    }

    if (action.startsWith('order-review-ref-add-selected-')) {
      addSelectedOrderReviewRef(action, actionEl.dataset.orderReviewId, Number(actionEl.dataset.reasonIndex) || 0);
      refreshSelection?.();
      return true;
    }

    return false;
  }

  return {
    clearRefPick: clearPendingOrderReasonRefPick,
    handleChange,
    handleClick,
    handlePickedPda: (annotation) => linkPickedReasonRef(buildPdaOrderReviewRef(annotation), getPdaOrderRefLabel(annotation)),
    handlePickedChartNote: (note) => linkPickedReasonRef(buildChartNoteOrderReviewRef(note), getChartNoteOrderRefLabel(note)),
    handlePickedSegment: (segment) => linkPickedReasonRef(buildSegmentOrderReviewRef(segment), getSegmentOrderRefLabel(segment)),
    handlePickedComposite: (segmentGroup) => linkPickedReasonRef({
      type: ORDER_REF_TYPES.COMPOSITE,
      id: segmentGroup?.id || segmentGroup,
      role: ORDER_REF_ROLES.CONTEXT,
    }, 'Composite Move'),
    handlePickedSmt: (record) => linkPickedReasonRef({
      type: ORDER_REF_TYPES.SMT,
      id: record?.id || record,
      role: ORDER_REF_ROLES.CONFIRMATION,
    }, 'SMT'),
    isPicking: hasPendingOrderReasonRefPick,
    getPendingRefPick: getPendingOrderReasonRefPick,
  };
}
