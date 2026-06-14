import * as bus from '../../event-bus.js';
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
import { setLiveRecordLifecycleStatus } from '../../live-record/live-record-lifecycle-actions.js';
import { getActiveReviewSetId } from '../../order/order-review-active.js';

function updateReason(record, reasonIndex, patch = {}) {
  const reasons = Array.isArray(record.reasons) ? record.reasons.map((reason) => ({ ...reason })) : [];
  const index = Number(reasonIndex);
  if (!Number.isInteger(index) || index < 0) return false;
  while (reasons.length <= index) {
    reasons.push({ id: `reason_${reasons.length + 1}`, category: 'other', note: '', refs: [] });
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
        bus.emit('status:update', { text: 'No active Order Setup to link', isError: true });
        return true;
      }
      mutate('Link Live Record To Setup', () => updateLiveRecord(liveRecordId, { orderSetupId: activeSetupId }));
      bus.emit('status:update', { text: 'Live Record linked to active Order Setup', isError: false });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-unlink-setup') {
      mutate('Unlink Live Record Setup', () => updateLiveRecord(liveRecordId, { orderSetupId: '' }));
      bus.emit('status:update', { text: 'Live Record setup link removed', isError: false });
      refreshSelection?.();
      return true;
    }

    if (action === 'live-record-reason-add') {
      const reasons = Array.isArray(record.reasons) ? record.reasons : [];
      mutate('Add Live Record Reason', () => updateLiveRecord(liveRecordId, {
        reasons: [
          ...reasons,
          { id: `reason_${reasons.length + 1}`, category: 'other', note: '', refs: [] },
        ],
      }));
      refreshSelection?.();
      return true;
    }

    return false;
  }

  return { handleChange, handleClick };
}
