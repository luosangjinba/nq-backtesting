// Browser-local Daily Time Reaction Observation draft persistence.

import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getWorkspaceDocument, putWorkspaceDocument } from '../storage/server-workspace-client.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  getDailyTimeReviewsWithContent,
  loadDailyTimeReviews,
} from './daily-time-review-store.js';

const STORAGE_KEY_BASE = 'v4:daily-time-reviews';
const STORAGE_VERSION = 1;
const WORKSPACE_DOMAIN = 'daily-time-reviews';
let restoring = false;

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `Time Reaction 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveDailyTimeReviews(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  const payload = {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    dailyTimeReviews: getDailyTimeReviewsWithContent(),
  };
  const saved = writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), payload, { onError: handleStorageError });
  saveDailyTimeReviewsToServer(instrument, payload);
  return saved;
}

export function restoreDailyTimeReviews(instrument = getPrimaryInstrument(), options = {}) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });
  const reviews = Array.isArray(payload?.dailyTimeReviews) ? payload.dailyTimeReviews : [];
  restoring = true;
  try {
    loadDailyTimeReviews(reviews, { preserveUpdatedAt: true });
  } finally {
    restoring = false;
  }
  if (reviews.length) {
    bus.emit('status:update', {
      text: `已恢复 ${reviews.length} 条本地 Time Reaction Observation`,
      isError: false,
    });
  }
  if (options.syncServer !== false) syncDailyTimeReviewsFromServer(instrument);
}

export function clearSavedDailyTimeReviews() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Time Reaction 本地保存已清除', isError: false });
  }
}

export function getDailyTimeReviewStorageKey() {
  return getInstrumentStorageKey(STORAGE_KEY_BASE);
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

export function getDailyTimeReviewWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export async function saveDailyTimeReviewsToServer(instrument = getPrimaryInstrument(), payload = null, options = {}) {
  if (restoring) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const nextPayload = payload || { version: STORAGE_VERSION, savedAt: Date.now(), instrument: normalizedInstrument, dailyTimeReviews: getDailyTimeReviewsWithContent() };
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      version: STORAGE_VERSION,
      payload: { ...nextPayload, instrument: normalizedInstrument, dailyTimeReviews: Array.isArray(nextPayload.dailyTimeReviews) ? nextPayload.dailyTimeReviews : [] },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[daily-time-review-persistence] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncDailyTimeReviewsFromServer(instrument = getPrimaryInstrument(), options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  try {
    const document = await getWorkspaceDocument({ domain: WORKSPACE_DOMAIN, instrument: normalizedInstrument, fetchImpl: options.fetchImpl });
    if (document?.found && Array.isArray(document.payload?.dailyTimeReviews)) {
      const payload = { version: Number(document.payload.version) || STORAGE_VERSION, savedAt: document.payload.savedAt || document.savedAt || Date.now(), instrument: normalizedInstrument, dailyTimeReviews: document.payload.dailyTimeReviews };
      restoring = true;
      try {
        loadDailyTimeReviews(payload.dailyTimeReviews, { preserveUpdatedAt: true });
        writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), payload, { onError: handleStorageError });
      } finally {
        restoring = false;
      }
      return { ok: true, source: 'server', document };
    }
    const localPayload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), null, { onError: handleStorageError });
    const localReviews = Array.isArray(localPayload?.dailyTimeReviews) ? localPayload.dailyTimeReviews : [];
    if (localReviews.length) return { ok: Boolean((await saveDailyTimeReviewsToServer(normalizedInstrument, { ...localPayload, instrument: normalizedInstrument, dailyTimeReviews: localReviews }, options))?.ok), source: 'local-migration' };
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[daily-time-review-persistence] server sync failed', error);
    return { ok: false, error };
  }
}

export function initDailyTimeReviewPersistence() {
  restoreDailyTimeReviews();
  bus.on('daily-time-review:changed', () => saveDailyTimeReviews());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveDailyTimeReviews(previousInstrument);
    restoreDailyTimeReviews(instrument);
  });
}
