import * as bus from '../event-bus.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import {
  getLiveRecords,
  loadLiveRecords,
} from './live-record-store.js';

const STORAGE_KEY_BASE = 'v4:live-records';
const STORAGE_VERSION = 1;
let restoring = false;
let initialized = false;

function handleStorageError(error, action) {
  const label = action === 'read'
    ? 'read'
    : action === 'remove'
      ? 'clear'
      : 'save';
  bus.emit('status:update', {
    text: `Live Records local ${label} failed: ${error.message}`,
    isError: true,
  });
}

function getPersistableLiveRecords(instrument = getPrimaryInstrument()) {
  return getLiveRecords().filter((record) => record.instrument === instrument);
}

export function getLiveRecordStorageKey(instrument = getPrimaryInstrument()) {
  return getInstrumentStorageKey(STORAGE_KEY_BASE, instrument);
}

export function saveLiveRecords(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  const liveRecords = getPersistableLiveRecords(instrument);
  return writeLocalJson(getLiveRecordStorageKey(instrument), {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    liveRecords,
  }, { onError: handleStorageError });
}

export function restoreLiveRecords(instrument = getPrimaryInstrument()) {
  const payload = readLocalJson(getLiveRecordStorageKey(instrument), null, { onError: handleStorageError });
  const restoredRecords = Array.isArray(payload?.liveRecords) ? payload.liveRecords : [];
  const liveRecords = restoredRecords.filter((record) => (
    !record?.instrument || record.instrument === instrument
  ));
  const skipped = restoredRecords.length - liveRecords.length;
  restoring = true;
  try {
    loadLiveRecords(liveRecords.map((record) => ({ ...record, instrument })));
  } finally {
    restoring = false;
  }
  if (restoredRecords.length > 0) {
    bus.emit('status:update', {
      text: skipped
        ? `Restored ${liveRecords.length} Live Records for ${instrument}; skipped ${skipped} mismatched`
        : `Restored ${liveRecords.length} Live Records for ${instrument}`,
      isError: false,
    });
  }
  return liveRecords.length;
}

export function clearSavedLiveRecords(instrument = getPrimaryInstrument()) {
  const removed = removeLocalJson(getLiveRecordStorageKey(instrument), { onError: handleStorageError });
  if (removed) {
    bus.emit('status:update', { text: `Live Records local save cleared for ${instrument}`, isError: false });
  }
  return removed;
}

export function initLiveRecordPersistence() {
  if (initialized) return;
  initialized = true;
  restoreLiveRecords();
  bus.on('live-record:changed', () => saveLiveRecords());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveLiveRecords(previousInstrument);
    restoreLiveRecords(instrument);
  });
}
