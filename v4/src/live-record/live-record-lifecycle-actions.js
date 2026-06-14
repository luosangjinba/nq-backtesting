import * as bus from '../event-bus.js';
import { recordHistory } from '../history/history-manager.js';
import {
  clearActiveLiveRecord,
  getActiveLiveRecordId,
} from './live-record-active.js';
import {
  getLiveRecordById,
  updateLiveRecord,
} from './live-record-store.js';
import {
  canTransitionLiveRecordStatus,
  getLiveRecordStatusLabel,
  isLiveRecordTerminalStatus,
} from './live-record-lifecycle.js';
import { LIVE_RECORD_STATUSES } from './live-record-types.js';

function clearActiveIfTerminal(recordId, status) {
  if (!isLiveRecordTerminalStatus(status)) return;
  if (getActiveLiveRecordId() !== recordId) return;
  clearActiveLiveRecord();
}

export function setLiveRecordLifecycleStatus(liveRecordId, status, options = {}) {
  const record = getLiveRecordById(liveRecordId);
  if (!record) {
    if (options.emitStatus !== false) {
      bus.emit('status:update', { text: 'Live Record not found', isError: true });
    }
    return null;
  }
  if (!canTransitionLiveRecordStatus(record.status, status)) {
    if (options.emitStatus !== false) {
      bus.emit('status:update', {
        text: `Cannot move Live Record from ${getLiveRecordStatusLabel(record.status)} to ${getLiveRecordStatusLabel(status)}`,
        isError: true,
      });
    }
    return null;
  }
  const label = options.label || `Set Live Record ${getLiveRecordStatusLabel(status)}`;
  const updated = recordHistory(label, () => {
    const next = updateLiveRecord(liveRecordId, { status });
    if (next) clearActiveIfTerminal(liveRecordId, status);
    return next;
  });
  if (options.emitStatus !== false) {
    bus.emit('status:update', {
      text: updated?.id
        ? `Live Record ${getLiveRecordStatusLabel(status)}`
        : `Live Record cannot be set ${getLiveRecordStatusLabel(status)}`,
      isError: !updated?.id,
    });
  }
  return updated;
}

export function closeLiveRecord(liveRecordId, options = {}) {
  return setLiveRecordLifecycleStatus(liveRecordId, LIVE_RECORD_STATUSES.CLOSED, {
    label: 'Close Live Record',
    ...options,
  });
}

export function cancelLiveRecord(liveRecordId, options = {}) {
  return setLiveRecordLifecycleStatus(liveRecordId, LIVE_RECORD_STATUSES.CANCELLED, {
    label: 'Cancel Live Record',
    ...options,
  });
}

export function markLiveRecordReviewed(liveRecordId, options = {}) {
  return setLiveRecordLifecycleStatus(liveRecordId, LIVE_RECORD_STATUSES.REVIEWED, {
    label: 'Mark Live Record Reviewed',
    ...options,
  });
}

export function reopenLiveRecord(liveRecordId, options = {}) {
  return setLiveRecordLifecycleStatus(liveRecordId, LIVE_RECORD_STATUSES.ACTIVE, {
    label: 'Reopen Live Record',
    ...options,
  });
}
