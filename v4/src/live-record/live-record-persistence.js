import * as bus from '../event-bus.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import {
  getWorkspaceDocument,
  putWorkspaceDocument,
} from '../storage/server-workspace-client.js';
import {
  getLiveRecords,
  loadLiveRecords,
} from './live-record-store.js';

const STORAGE_KEY_BASE = 'v4:live-records';
const STORAGE_VERSION = 1;
const WORKSPACE_DOMAIN = 'live-records';
let restoring = false;
let initialized = false;

function handleStorageError(error, action) {
  const label = action === 'read'
    ? 'read'
    : action === 'remove'
      ? 'clear'
      : 'save';
  bus.emit('status:update', {
    text: `Live Records local ${label} failed: ${error.message}`,
    isError: true,
  });
}

function getPersistableLiveRecords(instrument = getPrimaryInstrument()) {
  return getLiveRecords().filter((record) => record.instrument === instrument);
}

function normalizePersistedLiveRecords(payload = {}, instrument = getPrimaryInstrument()) {
  const records = Array.isArray(payload?.liveRecords) ? payload.liveRecords : [];
  return records
    .filter((record) => !record?.instrument || record.instrument === instrument)
    .map((record) => ({ ...record, instrument }));
}

function buildLiveRecordPayload(instrument = getPrimaryInstrument(), liveRecords = getPersistableLiveRecords(instrument)) {
  return {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    liveRecords,
  };
}

export function getLiveRecordStorageKey(instrument = getPrimaryInstrument()) {
  return getInstrumentStorageKey(STORAGE_KEY_BASE, instrument);
}

export function saveLiveRecords(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  const payload = buildLiveRecordPayload(instrument);
  const saved = writeLocalJson(getLiveRecordStorageKey(instrument), payload, { onError: handleStorageError });
  saveLiveRecordsToServer(instrument, payload);
  return saved;
}

export function restoreLiveRecords(instrument = getPrimaryInstrument(), options = {}) {
  const payload = readLocalJson(getLiveRecordStorageKey(instrument), null, { onError: handleStorageError });
  const restoredRecords = Array.isArray(payload?.liveRecords) ? payload.liveRecords : [];
  const liveRecords = normalizePersistedLiveRecords(payload, instrument);
  const skipped = restoredRecords.length - liveRecords.length;
  restoring = true;
  try {
    loadLiveRecords(liveRecords.map((record) => ({ ...record, instrument })));
  } finally {
    restoring = false;
  }
  if (restoredRecords.length > 0) {
    bus.emit('status:update', {
      text: skipped
        ? `Restored ${liveRecords.length} Live Records for ${instrument}; skipped ${skipped} mismatched`
        : `Restored ${liveRecords.length} Live Records for ${instrument}`,
      isError: false,
    });
  }
  if (options.syncServer !== false) {
    syncLiveRecordsFromServer(instrument);
  }
  return liveRecords.length;
}

export function clearSavedLiveRecords(instrument = getPrimaryInstrument()) {
  const removed = removeLocalJson(getLiveRecordStorageKey(instrument), { onError: handleStorageError });
  if (removed) {
    bus.emit('status:update', { text: `Live Records local save cleared for ${instrument}`, isError: false });
  }
  return removed;
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

function writeLocalLiveRecordPayload(instrument, payload) {
  return writeLocalJson(getLiveRecordStorageKey(instrument), {
    version: Number(payload?.version) || STORAGE_VERSION,
    savedAt: payload?.savedAt || Date.now(),
    instrument,
    liveRecords: normalizePersistedLiveRecords(payload, instrument),
  }, { onError: handleStorageError });
}

export function getLiveRecordWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export function getLiveRecordStorageKeyBase() {
  return STORAGE_KEY_BASE;
}

export async function saveLiveRecordsToServer(instrument = getPrimaryInstrument(), payload = null, options = {}) {
  if (restoring) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const nextPayload = payload || buildLiveRecordPayload(normalizedInstrument);
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      version: STORAGE_VERSION,
      payload: {
        ...nextPayload,
        version: Number(nextPayload.version) || STORAGE_VERSION,
        instrument: normalizedInstrument,
        liveRecords: normalizePersistedLiveRecords(nextPayload, normalizedInstrument),
      },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[live-record-persistence] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncLiveRecordsFromServer(instrument = getPrimaryInstrument(), options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  try {
    const document = await getWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      fetchImpl: options.fetchImpl,
    });
    if (document?.found && Array.isArray(document.payload?.liveRecords)) {
      const serverPayload = {
        version: Number(document.payload.version) || STORAGE_VERSION,
        savedAt: document.payload.savedAt || document.savedAt || Date.now(),
        instrument: normalizedInstrument,
        liveRecords: normalizePersistedLiveRecords(document.payload, normalizedInstrument),
      };
      restoring = true;
      try {
        loadLiveRecords(serverPayload.liveRecords);
        writeLocalLiveRecordPayload(normalizedInstrument, serverPayload);
      } finally {
        restoring = false;
      }
      bus.emit('status:update', {
        text: `Restored ${serverPayload.liveRecords.length} Live Records from server for ${normalizedInstrument}`,
        isError: false,
      });
      return { ok: true, source: 'server', document };
    }

    const localPayload = readLocalJson(getLiveRecordStorageKey(normalizedInstrument), null, { onError: handleStorageError });
    const localRecords = normalizePersistedLiveRecords(localPayload, normalizedInstrument);
    if (localRecords.length > 0) {
      const saved = await saveLiveRecordsToServer(normalizedInstrument, buildLiveRecordPayload(normalizedInstrument, localRecords), options);
      return { ok: Boolean(saved?.ok), source: 'local-migration', document: saved };
    }
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[live-record-persistence] server sync failed', error);
    return { ok: false, error };
  }
}

export function initLiveRecordPersistence() {
  if (initialized) return;
  initialized = true;
  restoreLiveRecords();
  bus.on('live-record:changed', () => saveLiveRecords());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveLiveRecords(previousInstrument);
    restoreLiveRecords(instrument);
  });
}
