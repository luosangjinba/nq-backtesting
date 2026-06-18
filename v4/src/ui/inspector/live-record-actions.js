import * as bus from '../../event-bus.js';
import { getAnnotationById } from '../../pda/pda-store.js';
import { getSelectedPda } from '../../pda/pda-selection.js';
import { getSelectedSegment, getSelectedSegmentGroup } from '../../segment/segment-selection.js';
import { getSegmentById } from '../../segment/segment-store.js';
import {
  buildPdaOrderRefMetadata,
  buildSegmentOrderRefMetadata,
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
import { getSmtRecordById } from '../../smt/smt-store.js';
import {
  LIVE_RECORD_REASON_CATEGORIES,
  LIVE_RECORD_REF_ROLES,
  LIVE_RECORD_REF_TYPES,
} from '../../live-record/live-record-types.js';

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
  getSelectedSmtId,
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

  function getSelectedLiveRecordRef() {
    const pdaSelection = getSelectedPda();
    if (pdaSelection) {
      const annotation = getAnnotationById(pdaSelection.id);
      if (!annotation) return { error: 'Selected PDA is missing' };
      return {
        ref: {
          type: LIVE_RECORD_REF_TYPES.PDA,
          id: annotation.id,
          role: LIVE_RECORD_REF_ROLES.CONTEXT,
          ...buildPdaOrderRefMetadata(annotation),
        },
        label: getPdaOrderRefLabel(annotation),
      };
    }

    const segmentSelection = getSelectedSegment();
    if (segmentSelection) {
      const segment = getSegmentById(segmentSelection.id);
      if (!segment) return { error: 'Selected Segment is missing' };
      return {
        ref: {
          type: LIVE_RECORD_REF_TYPES.SEGMENT,
          id: segment.id,
          role: LIVE_RECORD_REF_ROLES.CONTEXT,
          ...buildSegmentOrderRefMetadata(segment),
        },
        label: getSegmentOrderRefLabel(segment),
      };
    }

    const compositeSelection = getSelectedSegmentGroup();
    if (compositeSelection) {
      return {
        ref: {
          type: LIVE_RECORD_REF_TYPES.COMPOSITE,
          id: compositeSelection.id,
          role: LIVE_RECORD_REF_ROLES.CONTEXT,
        },
        label: 'Composite Move',
      };
    }

    const selectedSmtId = getSelectedSmtId?.();
    if (selectedSmtId && getSmtRecordById(selectedSmtId)) {
      return {
        ref: {
          type: LIVE_RECORD_REF_TYPES.SMT,
          id: selectedSmtId,
          role: LIVE_RECORD_REF_ROLES.CONTEXT,
        },
        label: 'SMT',
      };
    }

    return { error: 'No selected PDA / Segment / Composite / SMT' };
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
      if (field === 'patterns') {
        const pattern = target.dataset.liveRecordEntryPattern;
        const selectedPatterns = new Set(Array.isArray(entryContext.patterns) ? entryContext.patterns : []);
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

    if (action === 'live-record-ref-add-selected-object') {
      const selected = getSelectedLiveRecordRef();
      if (selected.error) {
        bus.emit('status:update', { text: selected.error, isError: true });
        return true;
      }
      const reasonIndex = Number(actionEl.dataset.reasonIndex) || 0;
      const added = addLiveRecordReasonRef(liveRecordId, reasonIndex, selected.ref);
      bus.emit('status:update', {
        text: added ? `${selected.label} linked to Live Record Reason ${reasonIndex + 1}` : 'Link selected object failed',
        isError: !added,
      });
      refreshSelection?.();
      return true;
    }

    return false;
  }

  return { handleChange, handleClick };
}
