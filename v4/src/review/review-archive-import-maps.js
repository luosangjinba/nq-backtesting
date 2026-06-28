import { ORDER_REF_TYPES } from '../order/order-review-types.js';

export function remapOrderReviewRef(ref, refIdMaps = {}) {
  if (ref.type === ORDER_REF_TYPES.PDA) {
    return { ...ref, id: refIdMaps.pdaIdMap?.get(ref.id) || ref.id };
  }
  if (ref.type === ORDER_REF_TYPES.SEGMENT) {
    return { ...ref, id: refIdMaps.segmentIdMap?.get(ref.id) || ref.id };
  }
  if (ref.type === ORDER_REF_TYPES.COMPOSITE) {
    return { ...ref, id: refIdMaps.groupIdMap?.get(ref.id) || ref.id };
  }
  if (ref.type === ORDER_REF_TYPES.SMT) {
    return { ...ref, id: refIdMaps.smtIdMap?.get(ref.id) || ref.id };
  }
  if (ref.type === ORDER_REF_TYPES.CHART_NOTE) {
    return { ...ref, id: refIdMaps.chartNoteIdMap?.get(ref.id) || ref.id };
  }
  if (ref.type === ORDER_REF_TYPES.ORDER_SETUP) {
    return { ...ref, id: refIdMaps.orderIdMap?.get(ref.id) || ref.id };
  }
  return ref;
}

export function remapOrderReviewLinkedRefs(order, refIdMaps = {}) {
  const refs = Array.isArray(order.setupThesis?.linkedObjectRefs)
    ? order.setupThesis.linkedObjectRefs.map((ref) => remapOrderReviewRef(ref, refIdMaps))
    : [];
  const reasons = Array.isArray(order.setupThesis?.reasons)
    ? order.setupThesis.reasons.map((reason) => ({
        ...reason,
        refs: Array.isArray(reason.refs)
          ? reason.refs.map((ref) => remapOrderReviewRef(ref, refIdMaps))
          : [],
      }))
    : order.setupThesis?.reasons;

  return {
    ...order,
    setupThesis: {
      ...(order.setupThesis || {}),
      linkedObjectRefs: refs,
      ...(reasons !== undefined ? { reasons } : {}),
    },
  };
}

function remapLiveRecordRef(ref = {}, refIdMaps = {}) {
  if (!ref?.id) return ref;
  if (ref.type === 'pda') return { ...ref, id: refIdMaps.pdaIdMap?.get(ref.id) || ref.id };
  if (ref.type === 'segment') return { ...ref, id: refIdMaps.segmentIdMap?.get(ref.id) || ref.id };
  if (ref.type === 'composite') return { ...ref, id: refIdMaps.groupIdMap?.get(ref.id) || ref.id };
  if (ref.type === 'smt') return { ...ref, id: refIdMaps.smtIdMap?.get(ref.id) || ref.id };
  if (ref.type === 'chart-note') return { ...ref, id: refIdMaps.chartNoteIdMap?.get(ref.id) || ref.id };
  if (ref.type === 'order-setup') return { ...ref, id: refIdMaps.orderIdMap?.get(ref.id) || ref.id };
  return ref;
}

export function remapLiveRecordRefs(record = {}, refIdMaps = {}) {
  const reasons = Array.isArray(record.reasons)
    ? record.reasons.map((reason) => ({
        ...reason,
        refs: Array.isArray(reason.refs)
          ? reason.refs.map((ref) => remapLiveRecordRef(ref, refIdMaps))
          : [],
      }))
    : record.reasons;
  return {
    ...record,
    orderSetupId: refIdMaps.orderIdMap?.get(record.orderSetupId) || record.orderSetupId || '',
    reasons,
    linkedObjectRefs: Array.isArray(record.linkedObjectRefs)
      ? record.linkedObjectRefs.map((ref) => remapLiveRecordRef(ref, refIdMaps))
      : [],
  };
}

export function remapDailyTimeReviewRefs(review, refIdMaps = {}) {
  const remapRefs = (refs = []) => (Array.isArray(refs) ? refs.map((ref) => remapOrderReviewRef(ref, refIdMaps)) : []);
  return {
    ...review,
    pre0930Context: {
      ...(review.pre0930Context || {}),
      refs: remapRefs(review.pre0930Context?.refs),
      items: Array.isArray(review.pre0930Context?.items)
        ? review.pre0930Context.items.map((item) => ({
            ...item,
            refs: remapRefs(item.refs),
          }))
        : review.pre0930Context?.items,
    },
    reactions: Array.isArray(review.reactions)
      ? review.reactions.map((reaction) => ({
          ...reaction,
          refs: remapRefs(reaction.refs),
          items: Array.isArray(reaction.items)
            ? reaction.items.map((item) => ({
                ...item,
                refs: remapRefs(item.refs),
              }))
            : reaction.items,
        }))
      : [],
    summary0930To1100: {
      ...(review.summary0930To1100 || {}),
      refs: remapRefs(review.summary0930To1100?.refs),
      items: Array.isArray(review.summary0930To1100?.items)
        ? review.summary0930To1100.items.map((item) => ({
            ...item,
            refs: remapRefs(item.refs),
          }))
        : review.summary0930To1100?.items,
    },
  };
}
