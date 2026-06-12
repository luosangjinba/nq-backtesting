import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getChartNotes, loadChartNotes } from './chart-note-store.js';

const STORAGE_KEY_BASE = 'v4:chart-notes';
const STORAGE_VERSION = 1;
let restoring = false;

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `Chart Notes 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveChartNotes(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    chartNotes: getChartNotes(),
  }, { onError: handleStorageError });
}

export function restoreChartNotes(instrument = getPrimaryInstrument()) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });
  const notes = Array.isArray(payload?.chartNotes) ? payload.chartNotes : [];
  restoring = true;
  try {
    loadChartNotes(notes);
  } finally {
    restoring = false;
  }

  if (notes.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${notes.length} 条本地 Chart Notes`,
      isError: false,
    });
  }
}

export function clearSavedChartNotes() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Chart Notes 本地保存已清除', isError: false });
  }
}

export function initChartNotePersistence() {
  restoreChartNotes();
  bus.on('chart-notes:changed', () => saveChartNotes());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveChartNotes(previousInstrument);
    restoreChartNotes(instrument);
  });
}
