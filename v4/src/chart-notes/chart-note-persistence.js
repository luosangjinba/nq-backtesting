import * as bus from '../event-bus.js';
import { getChartNotes, loadChartNotes } from './chart-note-store.js';

const STORAGE_KEY = 'v4:chart-notes:NQ';
const STORAGE_VERSION = 1;

let restoring = false;

function readPayload() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    bus.emit('status:update', {
      text: `Chart Notes 本地记录读取失败: ${err.message}`,
      isError: true,
    });
    return null;
  }
}

export function saveChartNotes() {
  if (restoring) return;

  try {
    const payload = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      chartNotes: getChartNotes(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    bus.emit('status:update', {
      text: `Chart Notes 本地保存失败: ${err.message}`,
      isError: true,
    });
  }
}

export function restoreChartNotes() {
  const payload = readPayload();
  if (!payload) return;

  const notes = Array.isArray(payload.chartNotes) ? payload.chartNotes : [];
  restoring = true;
  loadChartNotes(notes);
  restoring = false;

  if (notes.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${notes.length} 条本地 Chart Notes`,
      isError: false,
    });
  }
}

export function clearSavedChartNotes() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    bus.emit('status:update', { text: 'Chart Notes 本地保存已清除', isError: false });
  } catch (err) {
    bus.emit('status:update', {
      text: `Chart Notes 本地保存清除失败: ${err.message}`,
      isError: true,
    });
  }
}

export function initChartNotePersistence() {
  restoreChartNotes();
  bus.on('chart-notes:changed', saveChartNotes);
}
