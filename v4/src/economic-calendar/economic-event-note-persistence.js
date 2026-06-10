import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import { getEconomicEventNotes, loadEconomicEventNotes } from './economic-event-note-store.js';

const STORAGE_KEY = 'v4:economic-event-notes:NQ';
const STORAGE_VERSION = 1;

const persistence = createLocalPersistence({
  key: STORAGE_KEY,
  fallback: null,
  onError(error, action) {
    const label = action === 'read'
      ? '读取'
      : action === 'remove'
        ? '清除'
        : '保存';
    bus.emit('status:update', {
      text: `Economic Event Notes 本地${label}失败: ${error.message}`,
      isError: true,
    });
  },
});

export function saveEconomicEventNotes() {
  persistence.write({
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    notes: getEconomicEventNotes(),
  });
}

export function restoreEconomicEventNotes() {
  const payload = persistence.read();
  if (!payload) return;
  const notes = Array.isArray(payload.notes) ? payload.notes : [];
  persistence.runRestoring(() => {
    loadEconomicEventNotes(notes);
  });
}

export function initEconomicEventNotePersistence() {
  restoreEconomicEventNotes();
  bus.on('economic-event-notes:changed', saveEconomicEventNotes);
}
