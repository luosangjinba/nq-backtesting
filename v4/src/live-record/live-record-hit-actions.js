import * as bus from '../event-bus.js';
import { recordHistory } from '../history/history-manager.js';
import { clearActiveReviewSet } from '../order/order-review-active.js';
import { setActiveLiveRecord } from './live-record-active.js';
import {
  deleteLiveRecord,
  getLiveRecordById,
  updateLiveRecord,
} from './live-record-store.js';
import {
  clearLiveRecordElementSelection,
  selectLiveRecordElement,
} from './live-record-selection.js';
import { getLiveRecordElementLabel } from './live-record-chart-menu.js';

function deleteLiveRecordElement(liveRecordId, element) {
  const record = getLiveRecordById(liveRecordId);
  if (!record) return false;
  if (element === 'anchor') {
    return Boolean(updateLiveRecord(liveRecordId, { anchor: { timestamp: null, price: null, timeframe: 'manual' } }));
  }
  if (element === 'entry' || element === 'marketStructureShift' || element === 'stopLoss') {
    return Boolean(updateLiveRecord(liveRecordId, {
      execution: {
        [element]: {
          timestamp: null,
          timeframe: 'manual',
          price: null,
          endTimestamp: null,
          endTimeframe: 'manual',
        },
      },
    }));
  }
  if (element === 'result') {
    return Boolean(updateLiveRecord(liveRecordId, {
      result: {
        exitTimestamp: null,
        exitTimeframe: 'manual',
        exitPrice: null,
      },
    }));
  }
  const targets = Array.isArray(record.execution?.targets)
    ? record.execution.targets.filter((target) => target.role !== element && target.id !== element)
    : [];
  return Boolean(updateLiveRecord(liveRecordId, { execution: { targets } }));
}

function hideLiveRecordElement(liveRecordId, element) {
  const record = getLiveRecordById(liveRecordId);
  if (!record || !element) return false;
  return Boolean(updateLiveRecord(liveRecordId, {
    display: {
      ...(record.display || {}),
      elementVisibility: {
        ...(record.display?.elementVisibility || {}),
        [element]: false,
      },
    },
  }));
}

export function handleLiveRecordHitAction(action, {
  liveRecordId = '',
  liveRecordElement = '',
} = {}) {
  if (action === 'live-record-hit-set-active') {
    const active = setActiveLiveRecord(liveRecordId);
    if (active) clearActiveReviewSet();
    bus.emit('status:update', {
      text: active ? `Active Live Record: ${liveRecordId}` : 'Live Record cannot be activated',
      isError: !active,
    });
    return true;
  }
  if (action === 'live-record-hit-select-element') {
    const selection = selectLiveRecordElement(liveRecordId, liveRecordElement);
    bus.emit('status:update', {
      text: selection ? `Selected ${getLiveRecordElementLabel(liveRecordElement)}` : 'Live Record element cannot be selected',
      isError: !selection,
    });
    return true;
  }
  if (action === 'live-record-hit-hide-element') {
    const hidden = recordHistory('Hide Live Record Element', () => hideLiveRecordElement(liveRecordId, liveRecordElement));
    if (hidden) clearLiveRecordElementSelection();
    bus.emit('status:update', {
      text: hidden ? `${getLiveRecordElementLabel(liveRecordElement)} hidden` : 'Live Record element cannot be hidden',
      isError: !hidden,
    });
    return true;
  }
  if (action === 'live-record-hit-delete-element') {
    const deleted = recordHistory('Delete Live Record Element', () => deleteLiveRecordElement(liveRecordId, liveRecordElement));
    if (deleted) clearLiveRecordElementSelection();
    bus.emit('status:update', {
      text: deleted ? `${getLiveRecordElementLabel(liveRecordElement)} deleted` : 'Live Record element cannot be deleted',
      isError: !deleted,
    });
    return true;
  }
  if (action === 'live-record-hit-delete-record') {
    const deleted = recordHistory('Delete Live Record', () => deleteLiveRecord(liveRecordId));
    clearLiveRecordElementSelection();
    bus.emit('status:update', {
      text: deleted ? `Live Record deleted: ${liveRecordId}` : 'Live Record cannot be deleted',
      isError: !deleted,
    });
    return true;
  }
  return false;
}
