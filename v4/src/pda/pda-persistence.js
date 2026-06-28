// Browser-local PDA draft persistence. This is not the formal research database.

import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import {
  getWorkspaceDocument,
  putWorkspaceDocument,
} from '../storage/server-workspace-client.js';
import { WORKSPACE_DOMAINS } from '../storage/workspace-domain-registry.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getAnnotations, loadAnnotations } from './pda-store.js';

const STORAGE_KEY_BASE = 'v4:pda-annotations';
const WORKSPACE_DOMAIN_CONFIG = WORKSPACE_DOMAINS.PDA_ANNOTATIONS;
const STORAGE_VERSION = WORKSPACE_DOMAIN_CONFIG.version;
const WORKSPACE_DOMAIN = WORKSPACE_DOMAIN_CONFIG.name;
let restoring = false;
let localMutationVersion = 0;

function getPersistableAnnotations() {
  return getAnnotations().filter((annotation) => annotation.source !== 'draft' && !annotation.draft);
}

function normalizePersistedAnnotations(payload = {}) {
  const annotations = Array.isArray(payload?.annotations) ? payload.annotations : [];
  return annotations.filter((annotation) => annotation.source !== 'draft' && !annotation.draft);
}

function buildPdaPayload(instrument = getPrimaryInstrument(), annotations = getPersistableAnnotations()) {
  return {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    annotations,
  };
}

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `PDA 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveAnnotations(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  localMutationVersion += 1;
  const payload = buildPdaPayload(instrument);
  const saved = writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), payload, { onError: handleStorageError });
  saveAnnotationsToServer(instrument, payload);
  return saved;
}

export function restoreAnnotations(instrument = getPrimaryInstrument(), options = {}) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });
  const annotations = normalizePersistedAnnotations(payload);
  restoring = true;
  try {
    loadAnnotations(annotations);
  } finally {
    restoring = false;
  }

  if (annotations.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${annotations.length} 条本地 PDA 标注`,
      isError: false,
    });
  }
  if (options.syncServer !== false) {
    syncAnnotationsFromServer(instrument);
  }
}

export function clearSavedAnnotations() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'PDA 本地保存已清除', isError: false });
  }
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

function writeLocalPdaPayload(instrument, payload) {
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: Number(payload?.version) || STORAGE_VERSION,
    savedAt: payload?.savedAt || Date.now(),
    instrument,
    annotations: normalizePersistedAnnotations(payload),
  }, { onError: handleStorageError });
}

export function getPdaWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export function getPdaStorageKeyBase() {
  return STORAGE_KEY_BASE;
}

export async function saveAnnotationsToServer(instrument = getPrimaryInstrument(), payload = null, options = {}) {
  if (restoring) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const nextPayload = payload || buildPdaPayload(normalizedInstrument);
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      version: STORAGE_VERSION,
      payload: {
        ...nextPayload,
        version: Number(nextPayload.version) || STORAGE_VERSION,
        instrument: normalizedInstrument,
        annotations: normalizePersistedAnnotations(nextPayload),
      },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[pda-persistence] server save failed', error);
    return { ok: false, error };
  }
}

export async function migrateCurrentPdaAnnotationsToServer(instrument = getPrimaryInstrument(), options = {}) {
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const payload = buildPdaPayload(normalizedInstrument);
  writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), payload, { onError: handleStorageError });
  return saveAnnotationsToServer(normalizedInstrument, payload, options);
}

export async function syncAnnotationsFromServer(instrument = getPrimaryInstrument(), options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const syncToken = localMutationVersion;
  try {
    const document = await getWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      fetchImpl: options.fetchImpl,
    });
    if (document?.found && Array.isArray(document.payload?.annotations)) {
      if (localMutationVersion !== syncToken) return { ok: false, skipped: true, stale: true };
      const serverPayload = {
        version: Number(document.payload.version) || STORAGE_VERSION,
        savedAt: document.payload.savedAt || document.savedAt || Date.now(),
        instrument: normalizedInstrument,
        annotations: normalizePersistedAnnotations(document.payload),
      };
      restoring = true;
      try {
        loadAnnotations(serverPayload.annotations);
        writeLocalPdaPayload(normalizedInstrument, serverPayload);
      } finally {
        restoring = false;
      }
      bus.emit('status:update', {
        text: `已恢复 ${serverPayload.annotations.length} 条服务器 PDA 标注`,
        isError: false,
      });
      return { ok: true, source: 'server', document };
    }

    const localPayload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), null, { onError: handleStorageError });
    const localAnnotations = normalizePersistedAnnotations(localPayload);
    if (localAnnotations.length > 0) {
      const saved = await saveAnnotationsToServer(
        normalizedInstrument,
        buildPdaPayload(normalizedInstrument, localAnnotations),
        options
      );
      return { ok: Boolean(saved?.ok), source: 'local-migration', document: saved };
    }
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[pda-persistence] server sync failed', error);
    return { ok: false, error };
  }
}

export function initPdaPersistence() {
  restoreAnnotations();
  bus.on('pda:changed', () => saveAnnotations());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveAnnotations(previousInstrument);
    restoreAnnotations(instrument);
  });
}
