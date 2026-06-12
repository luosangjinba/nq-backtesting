import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  getTimeOverlaySettings,
  loadTimeOverlaySettings,
} from './time-overlay-store.js';

const STORAGE_KEY_BASE = 'v4:time-overlays';
const STORAGE_VERSION = 1;
let restoring = false;

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `Time Overlays 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

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

export function saveTimeOverlaySettings(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    settings: getPersistableSettings(),
  }, { onError: handleStorageError });
}

export function restoreTimeOverlaySettings(instrument = getPrimaryInstrument()) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });

  restoring = true;
  try {
    loadTimeOverlaySettings({
      ...(payload?.settings || {}),
      selectedDate: '',
      killzoneDraft: null,
    });
  } finally {
    restoring = false;
  }

  const eventCount = Array.isArray(payload?.settings?.eventTimes) ? payload.settings.eventTimes.length : 0;
  const killzoneCount = Array.isArray(payload?.settings?.killzones) ? payload.settings.killzones.length : 0;
  if (eventCount || killzoneCount) {
    bus.emit('status:update', {
      text: `已恢复 ${eventCount} 条 Time Lines 与 ${killzoneCount} 个 Killzones`,
      isError: false,
    });
  }
}

export function clearSavedTimeOverlaySettings() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Time Overlays 本地保存已清除', isError: false });
  }
}

export function initTimeOverlayPersistence() {
  restoreTimeOverlaySettings();
  bus.on('time-overlays:changed', () => saveTimeOverlaySettings());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveTimeOverlaySettings(previousInstrument);
    restoreTimeOverlaySettings(instrument);
  });
}
