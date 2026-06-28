import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getWorkspaceDocument, putWorkspaceDocument } from '../storage/server-workspace-client.js';
import { WORKSPACE_DOMAINS } from '../storage/workspace-domain-registry.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  getTimeOverlaySettings,
  loadTimeOverlaySettings,
} from './time-overlay-store.js';

const STORAGE_KEY_BASE = 'v4:time-overlays';
const WORKSPACE_DOMAIN_CONFIG = WORKSPACE_DOMAINS.TIME_OVERLAYS;
const STORAGE_VERSION = WORKSPACE_DOMAIN_CONFIG.version;
const WORKSPACE_DOMAIN = WORKSPACE_DOMAIN_CONFIG.name;
let restoring = false;
let localMutationVersion = 0;

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
  localMutationVersion += 1;
  const payload = {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    settings: getPersistableSettings(),
  };
  const saved = writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), payload, { onError: handleStorageError });
  saveTimeOverlaySettingsToServer(instrument, payload);
  return saved;
}

export function restoreTimeOverlaySettings(instrument = getPrimaryInstrument(), options = {}) {
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
  if (options.syncServer !== false) syncTimeOverlaySettingsFromServer(instrument);
}

export function clearSavedTimeOverlaySettings() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Time Overlays 本地保存已清除', isError: false });
  }
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

export function getTimeOverlayWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export async function saveTimeOverlaySettingsToServer(instrument = getPrimaryInstrument(), payload = null, options = {}) {
  if (restoring) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const nextPayload = payload || { version: STORAGE_VERSION, savedAt: Date.now(), instrument: normalizedInstrument, settings: getPersistableSettings() };
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      version: STORAGE_VERSION,
      payload: { ...nextPayload, instrument: normalizedInstrument, settings: nextPayload.settings || {} },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[time-overlay-persistence] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncTimeOverlaySettingsFromServer(instrument = getPrimaryInstrument(), options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const syncToken = localMutationVersion;
  try {
    const document = await getWorkspaceDocument({ domain: WORKSPACE_DOMAIN, instrument: normalizedInstrument, fetchImpl: options.fetchImpl });
    if (document?.found && document.payload?.settings) {
      if (localMutationVersion !== syncToken) return { ok: false, skipped: true, stale: true };
      const payload = { version: Number(document.payload.version) || STORAGE_VERSION, savedAt: document.payload.savedAt || document.savedAt || Date.now(), instrument: normalizedInstrument, settings: document.payload.settings };
      restoring = true;
      try {
        loadTimeOverlaySettings({ ...(payload.settings || {}), selectedDate: '', killzoneDraft: null });
        writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), payload, { onError: handleStorageError });
      } finally {
        restoring = false;
      }
      return { ok: true, source: 'server', document };
    }
    const localPayload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), null, { onError: handleStorageError });
    if (localPayload?.settings) return { ok: Boolean((await saveTimeOverlaySettingsToServer(normalizedInstrument, { ...localPayload, instrument: normalizedInstrument }, options))?.ok), source: 'local-migration' };
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[time-overlay-persistence] server sync failed', error);
    return { ok: false, error };
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
