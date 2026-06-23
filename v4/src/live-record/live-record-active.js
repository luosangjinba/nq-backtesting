import * as bus from '../event-bus.js';
import {
  addLiveRecord,
  getLiveRecordById,
  updateLiveRecord,
} from './live-record-store.js';
import { getLiveRecordDefaultChartStatus } from './live-record-lifecycle.js';
import { LIVE_RECORD_DIRECTIONS } from './live-record-types.js';

let activeLiveRecordId = null;
let initialized = false;

function emitActiveChanged(previousId = null) {
  bus.emit('live-record-active:changed', {
    activeLiveRecordId,
    previousLiveRecordId: previousId,
    liveRecord: getActiveLiveRecord(),
  });
}

export function getActiveLiveRecordId() {
  return activeLiveRecordId;
}

export function getActiveLiveRecord() {
  return activeLiveRecordId ? getLiveRecordById(activeLiveRecordId) : null;
}

export function setActiveLiveRecord(id) {
  if (!id || !getLiveRecordById(id)) return false;
  if (activeLiveRecordId === id) return true;
  const previousId = activeLiveRecordId;
  activeLiveRecordId = id;
  emitActiveChanged(previousId);
  return true;
}

export function clearActiveLiveRecord() {
  if (!activeLiveRecordId) return false;
  const previousId = activeLiveRecordId;
  activeLiveRecordId = null;
  emitActiveChanged(previousId);
  return true;
}

export function loadActiveLiveRecordId(id = null) {
  const nextId = id && getLiveRecordById(id) ? id : null;
  if (activeLiveRecordId === nextId) return true;
  const previousId = activeLiveRecordId;
  activeLiveRecordId = nextId;
  emitActiveChanged(previousId);
  return true;
}

export function createLiveRecordFromAnchor(anchor = {}, options = {}) {
  const record = addLiveRecord({
    sourceChartId: options.sourceChartId || '',
    sourceChartLabel: options.sourceChartLabel || '',
    sourceInstrument: options.sourceInstrument || '',
    sourceTimeframe: options.sourceTimeframe ?? null,
    sourceTimeframeLabel: options.sourceTimeframeLabel || '',
    sourceContext: options.sourceContext || '',
    instrument: options.instrument,
    direction: options.direction || LIVE_RECORD_DIRECTIONS.UNKNOWN,
    status: options.status || getLiveRecordDefaultChartStatus(),
    summary: options.summary || '',
    anchor,
  }, options);
  setActiveLiveRecord(record.id);
  return record;
}

export function patchActiveLiveRecord(patch = {}, options = {}) {
  if (!activeLiveRecordId) return null;
  return updateLiveRecord(activeLiveRecordId, patch, options);
}

export function syncActiveLiveRecord() {
  if (!activeLiveRecordId) return false;
  if (getLiveRecordById(activeLiveRecordId)) return true;
  return clearActiveLiveRecord();
}

export function initLiveRecordActive() {
  if (initialized) return;
  initialized = true;
  bus.on('live-record:changed', syncActiveLiveRecord);
}
