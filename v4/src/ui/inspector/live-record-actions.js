import * as bus from '../../event-bus.js';
import { VIEWPORT_TARGETS, locateChartRange } from '../../chart/viewport-router.js';
import { getChartNoteById } from '../../chart-notes/chart-note-store.js';
import { flashChartNote } from '../../chart-notes/chart-note-renderer.js';
import { getAnnotationById } from '../../pda/pda-store.js';
import { locatePdaProjection } from '../../pda/pda-locate-actions.js';
import { getSegmentById } from '../../segment/segment-store.js';
import {
  buildPdaOrderRefMetadata,
  buildChartNoteOrderRefMetadata,
  buildSegmentOrderRefMetadata,
  getChartNoteOrderRefLabel,
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from '../../order/order-ref-metadata.js';
import {
  deleteLiveRecord,
  getLiveRecordById,
  updateLiveRecord,
} from '../../live-record/live-record-store.js';
import {
  clearActiveLiveRecord,
  getActiveLiveRecordId,
  setActiveLiveRecord,
} from '../../live-record/live-record-active.js';
import {
  markLiveRecordReviewed,
  reopenLiveRecord,
  setLiveRecordLifecycleStatus,
} from '../../live-record/live-record-lifecycle-actions.js';
import { getActiveReviewSetId } from '../../order/order-review-active.js';
import { getSetupSetById } from '../../order/setup-set.js';
import {
  LIVE_RECORD_REASON_CATEGORIES,
  LIVE_RECORD_REF_ROLES,
  LIVE_RECORD_REF_TYPES,
} from '../../live-record/live-record-types.js';
import {
  getAnnotationTimestampRange,
  getSegmentTimestampRange,
} from './order-review-utils.js';

let pendingLiveRecordReasonRefPick = null;

const VIEWPORT_TARGET_LABELS = {
  [VIEWPORT_TARGETS.PRIMARY]: 'primary',
  [VIEWPORT_TARGETS.SECONDARY]: 'secondary',
  [VIEWPORT_TARGETS.COMPARISON]: 'comparison',
};

export function getPendingLiveRecordReasonRefPick() {
  return pendingLiveRecordReasonRefPick;
}

function setPendingLiveRecordReasonRefPick(nextPick) {
  pendingLiveRecordReasonRefPick = nextPick || null;
  return pendingLiveRecordReasonRefPick;
}

export function clearPendingLiveRecordReasonRefPick(options = {}) {
  pendingLiveRecordReasonRefPick = null;
  if (!options.silent) {
    bus.emit('status:update', { text: 'Live Record reason object selection cancelled', isError: false });
  }
}

export function hasPendingLiveRecordReasonRefPick() {
  return Boolean(pendingLiveRecordReasonRefPick);
}

function createLiveRecordReasonId() {
  return `reason_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyLiveRecordReason() {
  return {
    id: createLiveRecordReasonId(),
    category: LIVE_RECORD_REASON_CATEGORIES.OTHER,
    note: '',
    refs: [],
  };
}

function toViewportTarget(sourceChartId) {
  if (sourceChartId === VIEWPORT_TARGETS.SECONDARY) return VIEWPORT_TARGETS.SECONDARY;
  if (sourceChartId === VIEWPORT_TARGETS.COMPARISON) return VIEWPORT_TARGETS.COMPARISON;
  return VIEWPORT_TARGETS.PRIMARY;
}

function getLocatedPdaTargetLabels(result = {}) {
  return [
    result.primary?.located ? VIEWPORT_TARGET_LABELS[VIEWPORT_TARGETS.PRIMARY] : '',
    result.secondary?.located ? VIEWPORT_TARGET_LABELS[VIEWPORT_TARGETS.SECONDARY] : '',
    result.comparison?.located ? VIEWPORT_TARGET_LABELS[VIEWPORT_TARGETS.COMPARISON] : '',
  ].filter(Boolean);
}

function formatLocatedTargetList(targets = []) {
  if (targets.length <= 1) return targets[0] || '';
  if (targets.length === 2) return targets.join(' and ');
  return `${targets.slice(0, -1).join(', ')} and ${targets.at(-1)}`;
}

function getLiveRecordReasons(record) {
  const reasons = Array.isArray(record?.reasons) ? record.reasons : [];
  return reasons.length
    ? reasons.map((reason, index) => ({
      id: reason.id || `reason_${index + 1}`,
      category: reason.category || LIVE_RECORD_REASON_CATEGORIES.OTHER,
      note: reason.note || '',
      refs: Array.isArray(reason.refs) ? reason.refs : [],
    }))
    : [createEmptyLiveRecordReason()];
}

function updateReason(record, reasonIndex, patch = {}) {
  const reasons = getLiveRecordReasons(record).map((reason) => ({ ...reason }));
  const index = Number(reasonIndex);
  if (!Number.isInteger(index) || index < 0) return false;
  while (reasons.length <= index) {
    reasons.push(createEmptyLiveRecordReason());
  }
  reasons[index] = {
    ...reasons[index],
    ...patch,
  };
  return updateLiveRecord(record.id, { reasons });
}

export function createLiveRecordActionController({
  refreshSelection,
  captureCalendarOpenGroups,
  recordInspectorHistory,
} = {}) {
  function mutate(label, mutator) {
    return recordInspectorHistory?.(label, mutator) ?? mutator();
  }

  function addLiveRecordReasonRef(liveRecordId, reasonIndex, ref) {
    const record = getLiveRecordById(liveRecordId);
    if (!record || !ref?.type || !ref?.id) return false;
    const reasons = getLiveRecordReasons(record);
    const index = Number.isInteger(reasonIndex) && reasonIndex >= 0 ? reasonIndex : 0;
    while (reasons.length <= index) {
      reasons.push(createEmptyLiveRecordReason());
    }
    const refs = Array.isArray(reasons[index].refs) ? reasons[index].refs : [];
    const key = `${ref.type}:${ref.id}:${ref.role}`;
    if (refs.some((existing) => `${existing.type}:${existing.id}:${existing.role}` === key)) return false;
    reasons[index] = { ...reasons[index], refs: [...refs, ref] };
    return mutate('Link Live Record Reason Object', () => updateLiveRecord(liveRecordId, { reasons }));
  }

  function startReasonRefPick(actionEl) {
    const liveRecordId = actionEl.dataset.liveRecordId;
    const reasonIndex = Number(actionEl.dataset.reasonIndex) || 0;
    if (!getLiveRecordById(liveRecordId)) {
      bus.emit('status:update', { text: 'Live Record not found', isError: true });
      return true;
    }
    setPendingLiveRecordReasonRefPick({ liveRecordId, reasonIndex });
    bus.emit('status:update', {
      text: `Select a chart object to link to reason ${reasonIndex + 1}`,
      isError: false,
    });
    refreshSelection?.();
    return true;
  }

  function cancelReasonRefPick() {
    clearPendingLiveRecordReasonRefPick();
    refreshSelection?.();
    return true;
  }

  function linkPickedReasonRef(ref, label = 'Object') {
    const pendingPick = getPendingLiveRecordReasonRefPick();
    if (!pendingPick || !ref?.type || !ref?.id) return false;
    const added = addLiveRecordReasonRef(pendingPick.liveRecordId, pendingPick.reasonIndex, ref);
    clearPendingLiveRecordReasonRefPick({ silent: true });
    bus.emit('status:update', {
      text: added
        ? `${label} linked to Live Record Reason ${pendingPick.reasonIndex + 1}`
        : 'Link selected object failed',
      isError: !added,
    });
    refreshSelection?.();
    return Boolean(added);
  }

  function buildPdaLiveRecordRef(annotation) {
    return {
      type: LIVE_RECORD_REF_TYPES.PDA,
      id: annotation.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      ...buildPdaOrderRefMetadata(annotation),
    };
  }

  function buildSegmentLiveRecordRef(segment) {
    return {
      type: LIVE_RECORD_REF_TYPES.SEGMENT,
      id: segment.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      ...buildSegmentOrderRefMetadata(segment),
    };
  }

  function buildChartNoteLiveRecordRef(note) {
    return {
      type: LIVE_RECORD_REF_TYPES.CHART_NOTE,
      id: note.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      ...buildChartNoteOrderRefMetadata(note),
    };
  }

  function removeLiveRecordReasonRef(liveRecordId, reasonIndex, refIndex) {
    const record = getLiveRecordById(liveRecordId);
    const reasons = getLiveRecordReasons(record);
    if (!record || reasonIndex < 0 || reasonIndex >= reasons.length) return false;
    const refs = Array.isArray(reasons[reasonIndex].refs) ? reasons[reasonIndex].refs : [];
    if (refIndex < 0 || refIndex >= refs.length) return false;
    reasons[reasonIndex] = {
      ...reasons[reasonIndex],
      refs: refs.filter((_, index) => index !== refIndex),
    };
    return mutate('Remove Live Record Reason Object', () => updateLiveRecord(liveRecordId, { reasons }));
  }

  function getLiveRecordReasonRef(liveRecordId, reasonIndex, refIndex) {
    const record = getLiveRecordById(liveRecordId);
    const reasons = getLiveRecordReasons(record);
    const index = Number.isInteger(reasonIndex) && reasonIndex >= 0 ? reasonIndex : 0;
    const refs = Array.isArray(reasons[index]?.refs) ? reasons[index].refs : [];
    return refs[refIndex] || null;
  }

  function locateLiveRecordReasonRef(ref) {
    const type = String(ref?.type || ref?.refType || '').toLowerCase();
    let range = null;
    let sourceChartId = ref?.sourceChartId || 'primary';
    let label = 'linked object';

    if (type === LIVE_RECORD_REF_TYPES.PDA) {
      const annotation = getAnnotationById(ref.id || ref.refId);
      if (!annotation) {
        bus.emit('status:update', { text: 'Linked PDA not found', isError: true });
        return true;
      }
      sourceChartId = ref.sourceChartId || annotation.sourceChartId || sourceChartId;
      const result = locatePdaProjection(annotation, { chart: toViewportTarget(sourceChartId) });
      label = getPdaOrderRefLabel(annotation);
      const targets = getLocatedPdaTargetLabels(result);
      bus.emit('status:update', {
        text: targets.length
          ? `Located ${label} on ${formatLocatedTargetList(targets)}`
          : `${label} has no locatable loaded chart`,
        isError: !result.located,
      });
      return true;
    }

    if (type === LIVE_RECORD_REF_TYPES.SEGMENT) {
      const segment = getSegmentById(ref.id || ref.refId);
      if (!segment) {
        bus.emit('status:update', { text: 'Linked segment not found', isError: true });
        return true;
      }
      range = getSegmentTimestampRange(segment);
      sourceChartId = ref.sourceChartId || segment.sourceChartId || sourceChartId;
      label = getSegmentOrderRefLabel(segment);
    } else if (type === LIVE_RECORD_REF_TYPES.CHART_NOTE) {
      const note = getChartNoteById(ref.id || ref.refId);
      if (!note) {
        bus.emit('status:update', { text: 'Linked Chart Note not found', isError: true });
        return true;
      }
      const result = locateChartRange(VIEWPORT_TARGETS.PRIMARY, { start: note.timestamp, end: note.timestamp }, { flash: false });
      const located = Boolean(result.targets?.[VIEWPORT_TARGETS.PRIMARY]?.located);
      const flashed = located && flashChartNote(note.id);
      bus.emit('status:update', {
        text: flashed
          ? `Located ${getChartNoteOrderRefLabel(note)}`
          : 'Chart Note box is not visible on the current chart/timeframe',
        isError: !flashed,
      });
      return true;
    } else if (type === LIVE_RECORD_REF_TYPES.ORDER_SETUP) {
      const setup = getSetupSetById(ref.id || ref.refId);
      const start = setup?.range?.start ?? setup?.primaryTimestamp;
      const end = setup?.range?.end ?? setup?.primaryTimestamp;
      range = Number.isFinite(Number(start)) && Number.isFinite(Number(end))
        ? { start: Number(start), end: Number(end) }
        : null;
      label = 'Order Setup';
    } else {
      const annotation = type ? null : getAnnotationById(ref.id || ref.refId);
      range = annotation ? getAnnotationTimestampRange(annotation) : null;
    }

    if (!range) {
      bus.emit('status:update', { text: 'Linked object has no locatable time range', isError: true });
      return true;
    }

    const target = toViewportTarget(sourceChartId);
    const locateResult = locateChartRange(target, range);
    const located = Boolean(locateResult.targets?.[target]?.located);
    if (!located) {
      const targetLabel = VIEWPORT_TARGET_LABELS[target] || 'chart';
      bus.emit('status:update', {
        text: `${targetLabel[0].toUpperCase()}${targetLabel.slice(1)} chart cannot locate this linked object`,
        isError: true,
      });
      return true;
    }

    bus.emit('status:update', {
      text: `Located ${label} on ${VIEWPORT_TARGET_LABELS[target] || target}`,
      isError: false,
    });
    return true;
  }

  function deleteLiveRecordReason(liveRecordId, reasonIndex) {
    const record = getLiveRecordById(liveRecordId);
    const reasons = getLiveRecordReasons(record);
    if (!record || reasonIndex < 0 || reasonIndex >= reasons.length) return false;
    const nextReasons = reasons.filter((_, index) => index !== reasonIndex);
    return mutate('Delete Live Record Reason', () => updateLiveRecord(liveRecordId, {
      reasons: nextReasons.length ? nextReasons : [createEmptyLiveRecordReason()],
    }));
  }

  function handleChange(action, target) {
    const liveRecordId = target.dataset.liveRecordId;
    if (!liveRecordId) return false;
    const record = getLiveRecordById(liveRecordId);
    if (!record) {
      bus.emit('status:update', { text: 'Live Record not found', isError: true });
      return true;
    }

    if (action === 'live-record-summary') {
      mutate('Edit Live Record Summary', () => updateLiveRecord(liveRecordId, { summary: target.value || '' }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-display-field') {
      const field = target.dataset.liveRecordField;
      if (!field) return true;
      mutate('Edit Live Record Display', () => updateLiveRecord(liveRecordId, {
        display: {
          ...(record.display || {}),
          [field]: Boolean(target.checked),
        },
      }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-entry-context-field') {
      const field = target.dataset.liveRecordField;
      if (!field) return true;
      const entryContext = record.entryContext || {};
      let value = target.value || 'unknown';
      if (field === 'patternIds') {
        const pattern = target.dataset.liveRecordEntryPattern;
        const selectedPatterns = new Set(Array.isArray(entryContext.patternIds) ? entryContext.patternIds : []);
        if (target.checked) selectedPatterns.add(pattern);
        else selectedPatterns.delete(pattern);
        value = [...selectedPatterns].filter(Boolean);
      }
      mutate('Edit Live Record Entry Context', () => updateLiveRecord(liveRecordId, {
        entryContext: {
          ...entryContext,
          [field]: value,
        },
      }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-order-lesson-field') {
      const orderIndex = Number(target.dataset.liveRecordOrderIndex);
      const lessonId = String(target.dataset.liveRecordLessonId || '').trim();
      const orders = Array.isArray(record.execution?.orders) ? record.execution.orders : [];
      if (!Number.isInteger(orderIndex) || orderIndex < 0 || orderIndex >= orders.length || !lessonId) return true;
      const nextOrders = orders.map((order, index) => {
        if (index !== orderIndex) return order;
        const selected = new Set(Array.isArray(order.lessonIds) ? order.lessonIds : []);
        if (target.checked) selected.add(lessonId);
        else selected.delete(lessonId);
        return {
          ...order,
          lessonIds: [...selected].filter(Boolean),
        };
      });
      mutate('Edit Live Record Order Lessons', () => updateLiveRecord(liveRecordId, {
        execution: {
          ...(record.execution || {}),
          orders: nextOrders,
        },
      }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-match-setup') {
      const setupId = String(target.value || '').trim();
      if (setupId && !getSetupSetById(setupId)) {
        bus.emit('status:update', { text: 'Selected Setup is missing', isError: true });
        return true;
      }
      mutate('Match Live Record To Setup', () => updateLiveRecord(liveRecordId, { orderSetupId: setupId }));
      bus.emit('status:update', {
        text: setupId ? 'Live Record matched to Setup' : 'Live Record setup match cleared',
        isError: false,
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-result-status') {
      mutate('Edit Live Record Result', () => updateLiveRecord(liveRecordId, {
        result: {
          ...(record.result || {}),
          status: target.value || 'unknown',
        },
      }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-result-exit-type') {
      mutate('Edit Live Record Result', () => updateLiveRecord(liveRecordId, {
        result: {
          ...(record.result || {}),
          exitType: target.value || 'unknown',
        },
      }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-result-note') {
      mutate('Edit Live Record Result Note', () => updateLiveRecord(liveRecordId, {
        result: {
          ...(record.result || {}),
          note: target.value || '',
        },
      }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-result-execution-review') {
      mutate('Edit Live Record Execution Review', () => updateLiveRecord(liveRecordId, {
        result: {
          ...(record.result || {}),
          executionReviewNote: target.value || '',
        },
      }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-reviewed-toggle') {
      if (target.checked) markLiveRecordReviewed(liveRecordId);
      else reopenLiveRecord(liveRecordId);
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-reason-category') {
      mutate('Edit Live Record Reason', () => updateReason(record, target.dataset.reasonIndex, { category: target.value || 'other' }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-reason-note') {
      mutate('Edit Live Record Reason Note', () => updateReason(record, target.dataset.reasonIndex, { note: target.value || '' }));
      refreshSelection?.();
      return true;
    }

    return false;
  }

  function handleClick(action, actionEl) {
    const liveRecordId = actionEl.dataset.liveRecordId;

    if (action === 'live-record-set-active') {
      const changed = setActiveLiveRecord(liveRecordId);
      bus.emit('status:update', {
        text: changed ? 'Live Record set active' : 'Live Record not found',
        isError: !changed,
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-clear-active') {
      clearActiveLiveRecord();
      bus.emit('status:update', { text: 'Active Live Record cleared', isError: false });
      refreshSelection?.();
      return true;
    }

    const record = liveRecordId ? getLiveRecordById(liveRecordId) : null;
    if (!record) {
      if (action.startsWith('live-record-')) {
        bus.emit('status:update', { text: 'Live Record not found', isError: true });
        return true;
      }
      return false;
    }

    if (action === 'live-record-toggle-hidden') {
      captureCalendarOpenGroups?.();
      const nextHidden = !Boolean(record.display?.hidden);
      mutate(nextHidden ? 'Hide Live Record' : 'Show Live Record', () => updateLiveRecord(liveRecordId, {
        display: {
          ...(record.display || {}),
          hidden: nextHidden,
        },
      }));
      bus.emit('status:update', { text: nextHidden ? 'Live Record hidden' : 'Live Record shown', isError: false });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-status') {
      const status = actionEl.dataset.liveRecordStatus;
      setLiveRecordLifecycleStatus(liveRecordId, status);
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-delete') {
      captureCalendarOpenGroups?.();
      const wasActive = getActiveLiveRecordId() === liveRecordId;
      const deleted = mutate('Delete Live Record', () => deleteLiveRecord(liveRecordId));
      if (wasActive) clearActiveLiveRecord();
      bus.emit('status:update', {
        text: deleted ? 'Live Record deleted' : 'Live Record delete failed',
        isError: !deleted,
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-link-active-setup') {
      const activeSetupId = getActiveReviewSetId();
      if (!activeSetupId) {
        bus.emit('status:update', { text: 'No active Setup to match', isError: true });
        return true;
      }
      mutate('Link Live Record To Setup', () => updateLiveRecord(liveRecordId, { orderSetupId: activeSetupId }));
      bus.emit('status:update', { text: 'Live Record matched to active Setup', isError: false });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-unlink-setup') {
      mutate('Unlink Live Record Setup', () => updateLiveRecord(liveRecordId, { orderSetupId: '' }));
      bus.emit('status:update', { text: 'Live Record setup match cleared', isError: false });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-reason-add') {
      const reasons = getLiveRecordReasons(record);
      mutate('Add Live Record Reason', () => updateLiveRecord(liveRecordId, {
        reasons: [
          ...reasons,
          createEmptyLiveRecordReason(),
        ],
      }));
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-reason-delete') {
      const deleted = deleteLiveRecordReason(liveRecordId, Number(actionEl.dataset.reasonIndex));
      bus.emit('status:update', {
        text: deleted ? 'Live Record reason deleted' : 'Live Record reason delete failed',
        isError: !deleted,
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-ref-remove') {
      const removed = removeLiveRecordReasonRef(
        liveRecordId,
        Number(actionEl.dataset.reasonIndex),
        Number(actionEl.dataset.refIndex)
      );
      bus.emit('status:update', {
        text: removed ? 'Live Record linked object removed' : 'Remove linked object failed',
        isError: !removed,
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-ref-locate') {
      const ref = getLiveRecordReasonRef(
        liveRecordId,
        Number(actionEl.dataset.reasonIndex),
        Number(actionEl.dataset.refIndex)
      );
      if (ref) locateLiveRecordReasonRef(ref);
      else bus.emit('status:update', { text: 'Live Record linked object not found', isError: true });
      return true;
    }

    if (action === 'live-record-ref-pick-start') {
      return startReasonRefPick(actionEl);
    }

    if (action === 'live-record-ref-pick-cancel') {
      return cancelReasonRefPick();
    }

    return false;
  }

  return {
    clearRefPick: clearPendingLiveRecordReasonRefPick,
    getPendingRefPick: getPendingLiveRecordReasonRefPick,
    handleChange,
    handleClick,
    handlePickedPda: (annotation) => linkPickedReasonRef(buildPdaLiveRecordRef(annotation), getPdaOrderRefLabel(annotation)),
    handlePickedSegment: (segment) => linkPickedReasonRef(buildSegmentLiveRecordRef(segment), getSegmentOrderRefLabel(segment)),
    handlePickedChartNote: (note) => linkPickedReasonRef(buildChartNoteLiveRecordRef(note), getChartNoteOrderRefLabel(note)),
    handlePickedComposite: (segmentGroup) => linkPickedReasonRef({
      type: LIVE_RECORD_REF_TYPES.COMPOSITE,
      id: segmentGroup?.id || segmentGroup,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
    }, 'Composite Move'),
    handlePickedSmt: (record) => linkPickedReasonRef({
      type: LIVE_RECORD_REF_TYPES.SMT,
      id: record?.id || record,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
    }, 'SMT'),
    isPicking: hasPendingLiveRecordReasonRefPick,
  };
}
