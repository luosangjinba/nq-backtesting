// Browser-local market segment draft persistence. This is not the formal review archive.

import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import {
  getWorkspaceDocument,
  putWorkspaceDocument,
} from '../storage/server-workspace-client.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getSegments, loadSegments } from './segment-store.js';
import { getSegmentGroups, loadSegmentGroups } from './segment-group-store.js';

const STORAGE_KEY_BASE = 'v4:market-segments';
const STORAGE_VERSION = 2;
const WORKSPACE_DOMAIN = 'market-segments';
let restoring = false;
let localMutationVersion = 0;

function getPersistableSegments() {
  return getSegments().filter((segment) => segment.source !== 'draft' && !segment.draft);
}

function getPersistableSegmentGroups() {
  return getSegmentGroups().filter((group) => group.type === 'composite-move');
}

function normalizePersistedSegments(payload = {}) {
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];
  return segments.filter((segment) => segment.source !== 'draft' && !segment.draft);
}

function normalizePersistedSegmentGroups(payload = {}) {
  const groups = Array.isArray(payload?.segmentGroups) ? payload.segmentGroups : [];
  return groups.filter((group) => group?.type === 'composite-move');
}

function buildSegmentPayload(instrument = getPrimaryInstrument(), segments = getPersistableSegments(), segmentGroups = getPersistableSegmentGroups()) {
  return {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    segments,
    segmentGroups,
  };
}

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `Segment 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveSegments(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  localMutationVersion += 1;
  const payload = buildSegmentPayload(instrument);
  const saved = writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), payload, { onError: handleStorageError });
  saveSegmentsToServer(instrument, payload);
  return saved;
}

export function restoreSegments(instrument = getPrimaryInstrument(), options = {}) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });
  const segments = normalizePersistedSegments(payload);
  const segmentGroups = normalizePersistedSegmentGroups(payload);
  restoring = true;
  try {
    loadSegments(segments);
    loadSegmentGroups(segmentGroups);
  } finally {
    restoring = false;
  }

  if (segments.length > 0 || segmentGroups.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${segments.length} 条本地行情段与 ${segmentGroups.length} 个 Composite Move`,
      isError: false,
    });
  }
  if (options.syncServer !== false) {
    syncSegmentsFromServer(instrument);
  }
}

export function clearSavedSegments() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Segment 本地保存已清除', isError: false });
  }
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

function writeLocalSegmentPayload(instrument, payload) {
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: Number(payload?.version) || STORAGE_VERSION,
    savedAt: payload?.savedAt || Date.now(),
    instrument,
    segments: normalizePersistedSegments(payload),
    segmentGroups: normalizePersistedSegmentGroups(payload),
  }, { onError: handleStorageError });
}

export function getSegmentWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export function getSegmentStorageKeyBase() {
  return STORAGE_KEY_BASE;
}

export async function saveSegmentsToServer(instrument = getPrimaryInstrument(), payload = null, options = {}) {
  if (restoring) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const nextPayload = payload || buildSegmentPayload(normalizedInstrument);
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      version: STORAGE_VERSION,
      payload: {
        ...nextPayload,
        version: Number(nextPayload.version) || STORAGE_VERSION,
        instrument: normalizedInstrument,
        segments: normalizePersistedSegments(nextPayload),
        segmentGroups: normalizePersistedSegmentGroups(nextPayload),
      },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[segment-persistence] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncSegmentsFromServer(instrument = getPrimaryInstrument(), options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const syncToken = localMutationVersion;
  try {
    const document = await getWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      fetchImpl: options.fetchImpl,
    });
    if (document?.found && (Array.isArray(document.payload?.segments) || Array.isArray(document.payload?.segmentGroups))) {
      if (localMutationVersion !== syncToken) return { ok: false, skipped: true, stale: true };
      const serverPayload = {
        version: Number(document.payload.version) || STORAGE_VERSION,
        savedAt: document.payload.savedAt || document.savedAt || Date.now(),
        instrument: normalizedInstrument,
        segments: normalizePersistedSegments(document.payload),
        segmentGroups: normalizePersistedSegmentGroups(document.payload),
      };
      restoring = true;
      try {
        loadSegments(serverPayload.segments);
        loadSegmentGroups(serverPayload.segmentGroups);
        writeLocalSegmentPayload(normalizedInstrument, serverPayload);
      } finally {
        restoring = false;
      }
      bus.emit('status:update', {
        text: `已恢复 ${serverPayload.segments.length} 条服务器行情段与 ${serverPayload.segmentGroups.length} 个 Composite Move`,
        isError: false,
      });
      return { ok: true, source: 'server', document };
    }

    const localPayload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), null, { onError: handleStorageError });
    const localSegments = normalizePersistedSegments(localPayload);
    const localGroups = normalizePersistedSegmentGroups(localPayload);
    if (localSegments.length > 0 || localGroups.length > 0) {
      const saved = await saveSegmentsToServer(
        normalizedInstrument,
        buildSegmentPayload(normalizedInstrument, localSegments, localGroups),
        options
      );
      return { ok: Boolean(saved?.ok), source: 'local-migration', document: saved };
    }
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[segment-persistence] server sync failed', error);
    return { ok: false, error };
  }
}

export function initSegmentPersistence() {
  restoreSegments();
  bus.on('segment:changed', () => saveSegments());
  bus.on('segment-group:changed', () => saveSegments());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveSegments(previousInstrument);
    restoreSegments(instrument);
  });
}
