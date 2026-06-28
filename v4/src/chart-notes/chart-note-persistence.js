import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getWorkspaceDocument, putWorkspaceDocument } from '../storage/server-workspace-client.js';
import { WORKSPACE_DOMAINS } from '../storage/workspace-domain-registry.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getChartNotes, loadChartNotes } from './chart-note-store.js';

const STORAGE_KEY_BASE = 'v4:chart-notes';
const WORKSPACE_DOMAIN_CONFIG = WORKSPACE_DOMAINS.CHART_NOTES;
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
    text: `Chart Notes 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveChartNotes(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  localMutationVersion += 1;
  const payload = {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    chartNotes: getChartNotes(),
  };
  const saved = writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), payload, { onError: handleStorageError });
  saveChartNotesToServer(instrument, payload);
  return saved;
}

export function restoreChartNotes(instrument = getPrimaryInstrument(), options = {}) {
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
  if (options.syncServer !== false) syncChartNotesFromServer(instrument);
}

export function clearSavedChartNotes() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Chart Notes 本地保存已清除', isError: false });
  }
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

export function getChartNoteWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export async function saveChartNotesToServer(instrument = getPrimaryInstrument(), payload = null, options = {}) {
  if (restoring) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const nextPayload = payload || { version: STORAGE_VERSION, savedAt: Date.now(), instrument: normalizedInstrument, chartNotes: getChartNotes() };
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      version: STORAGE_VERSION,
      payload: { ...nextPayload, instrument: normalizedInstrument, chartNotes: Array.isArray(nextPayload.chartNotes) ? nextPayload.chartNotes : [] },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[chart-note-persistence] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncChartNotesFromServer(instrument = getPrimaryInstrument(), options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const syncToken = localMutationVersion;
  try {
    const document = await getWorkspaceDocument({ domain: WORKSPACE_DOMAIN, instrument: normalizedInstrument, fetchImpl: options.fetchImpl });
    if (document?.found && Array.isArray(document.payload?.chartNotes)) {
      if (localMutationVersion !== syncToken) return { ok: false, skipped: true, stale: true };
      const payload = { version: Number(document.payload.version) || STORAGE_VERSION, savedAt: document.payload.savedAt || document.savedAt || Date.now(), instrument: normalizedInstrument, chartNotes: document.payload.chartNotes };
      restoring = true;
      try {
        loadChartNotes(payload.chartNotes);
        writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), payload, { onError: handleStorageError });
      } finally {
        restoring = false;
      }
      return { ok: true, source: 'server', document };
    }
    const localPayload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), null, { onError: handleStorageError });
    const localNotes = Array.isArray(localPayload?.chartNotes) ? localPayload.chartNotes : [];
    if (localNotes.length) return { ok: Boolean((await saveChartNotesToServer(normalizedInstrument, { ...localPayload, instrument: normalizedInstrument, chartNotes: localNotes }, options))?.ok), source: 'local-migration' };
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[chart-note-persistence] server sync failed', error);
    return { ok: false, error };
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
