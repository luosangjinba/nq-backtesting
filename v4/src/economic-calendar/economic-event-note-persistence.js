import * as bus from '../event-bus.js';
import { readLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getEconomicEventNotes, loadEconomicEventNotes } from './economic-event-note-store.js';

const STORAGE_KEY_BASE = 'v4:economic-event-notes';
const STORAGE_VERSION = 1;
let restoring = false;

function handleStorageError(error, action) {
  const label = action === 'read' ? '读取' : '保存';
  bus.emit('status:update', {
    text: `Economic Event Notes 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveEconomicEventNotes(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    notes: getEconomicEventNotes(),
  }, { onError: handleStorageError });
}

export function restoreEconomicEventNotes(instrument = getPrimaryInstrument()) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });
  const notes = Array.isArray(payload?.notes) ? payload.notes : [];
  restoring = true;
  try {
    loadEconomicEventNotes(notes);
  } finally {
    restoring = false;
  }
}

export function initEconomicEventNotePersistence() {
  restoreEconomicEventNotes();
  bus.on('economic-event-notes:changed', () => saveEconomicEventNotes());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveEconomicEventNotes(previousInstrument);
    restoreEconomicEventNotes(instrument);
  });
}
