import * as bus from '../event-bus.js';
import { readLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getWorkspaceDocument, putWorkspaceDocument } from '../storage/server-workspace-client.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getEconomicEventNotes, loadEconomicEventNotes } from './economic-event-note-store.js';

const STORAGE_KEY_BASE = 'v4:economic-event-notes';
const STORAGE_VERSION = 1;
const WORKSPACE_DOMAIN = 'economic-event-notes';
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
  const payload = {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    notes: getEconomicEventNotes(),
  };
  const saved = writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), payload, { onError: handleStorageError });
  saveEconomicEventNotesToServer(instrument, payload);
  return saved;
}

export function restoreEconomicEventNotes(instrument = getPrimaryInstrument(), options = {}) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });
  const notes = Array.isArray(payload?.notes) ? payload.notes : [];
  restoring = true;
  try {
    loadEconomicEventNotes(notes);
  } finally {
    restoring = false;
  }
  if (options.syncServer !== false) syncEconomicEventNotesFromServer(instrument);
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

export function getEconomicEventNoteWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export async function saveEconomicEventNotesToServer(instrument = getPrimaryInstrument(), payload = null, options = {}) {
  if (restoring) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const nextPayload = payload || { version: STORAGE_VERSION, savedAt: Date.now(), instrument: normalizedInstrument, notes: getEconomicEventNotes() };
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      version: STORAGE_VERSION,
      payload: { ...nextPayload, instrument: normalizedInstrument, notes: Array.isArray(nextPayload.notes) ? nextPayload.notes : [] },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[economic-event-note-persistence] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncEconomicEventNotesFromServer(instrument = getPrimaryInstrument(), options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  try {
    const document = await getWorkspaceDocument({ domain: WORKSPACE_DOMAIN, instrument: normalizedInstrument, fetchImpl: options.fetchImpl });
    if (document?.found && Array.isArray(document.payload?.notes)) {
      const payload = { version: Number(document.payload.version) || STORAGE_VERSION, savedAt: document.payload.savedAt || document.savedAt || Date.now(), instrument: normalizedInstrument, notes: document.payload.notes };
      restoring = true;
      try {
        loadEconomicEventNotes(payload.notes);
        writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), payload, { onError: handleStorageError });
      } finally {
        restoring = false;
      }
      return { ok: true, source: 'server', document };
    }
    const localPayload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), null, { onError: handleStorageError });
    const localNotes = Array.isArray(localPayload?.notes) ? localPayload.notes : [];
    if (localNotes.length) return { ok: Boolean((await saveEconomicEventNotesToServer(normalizedInstrument, { ...localPayload, instrument: normalizedInstrument, notes: localNotes }, options))?.ok), source: 'local-migration' };
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[economic-event-note-persistence] server sync failed', error);
    return { ok: false, error };
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
