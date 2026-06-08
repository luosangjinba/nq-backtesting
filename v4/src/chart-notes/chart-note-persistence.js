import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import { getChartNotes, loadChartNotes } from './chart-note-store.js';

const STORAGE_KEY = 'v4:chart-notes:NQ';
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
      text: `Chart Notes 本地${label}失败: ${error.message}`,
      isError: true,
    });
  },
});

export function saveChartNotes() {
  persistence.write({
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    chartNotes: getChartNotes(),
  });
}

export function restoreChartNotes() {
  const payload = persistence.read();
  if (!payload) return;

  const notes = Array.isArray(payload.chartNotes) ? payload.chartNotes : [];
  persistence.runRestoring(() => {
    loadChartNotes(notes);
  });

  if (notes.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${notes.length} 条本地 Chart Notes`,
      isError: false,
    });
  }
}

export function clearSavedChartNotes() {
  if (persistence.remove()) {
    bus.emit('status:update', { text: 'Chart Notes 本地保存已清除', isError: false });
  }
}

export function initChartNotePersistence() {
  restoreChartNotes();
  bus.on('chart-notes:changed', saveChartNotes);
}
