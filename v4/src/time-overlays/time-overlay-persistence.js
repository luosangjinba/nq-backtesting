import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import {
  getTimeOverlaySettings,
  loadTimeOverlaySettings,
} from './time-overlay-store.js';

const STORAGE_KEY = 'v4:time-overlays:NQ';
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
      text: `Time Overlays 本地${label}失败: ${error.message}`,
      isError: true,
    });
  },
});

function getPersistableSettings() {
  const settings = getTimeOverlaySettings();
  return {
    enabled: settings.enabled,
    showDayBoundary: settings.showDayBoundary,
    dayBoundaryColor: settings.dayBoundaryColor,
    eventTimes: settings.eventTimes || [],
    killzones: settings.killzones || [],
  };
}

export function saveTimeOverlaySettings() {
  persistence.write({
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    settings: getPersistableSettings(),
  });
}

export function restoreTimeOverlaySettings() {
  const payload = persistence.read();
  if (!payload?.settings) return;

  persistence.runRestoring(() => {
    loadTimeOverlaySettings({
      ...payload.settings,
      selectedDate: '',
      killzoneDraft: null,
    });
  });

  const eventCount = Array.isArray(payload.settings.eventTimes) ? payload.settings.eventTimes.length : 0;
  const killzoneCount = Array.isArray(payload.settings.killzones) ? payload.settings.killzones.length : 0;
  if (eventCount || killzoneCount) {
    bus.emit('status:update', {
      text: `已恢复 ${eventCount} 条 Time Lines 与 ${killzoneCount} 个 Killzones`,
      isError: false,
    });
  }
}

export function clearSavedTimeOverlaySettings() {
  if (persistence.remove()) {
    bus.emit('status:update', { text: 'Time Overlays 本地保存已清除', isError: false });
  }
}

export function initTimeOverlayPersistence() {
  restoreTimeOverlaySettings();
  bus.on('time-overlays:changed', saveTimeOverlaySettings);
}
