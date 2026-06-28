// Browser-local Order Review draft persistence. This is not the formal research archive.

import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import {
  getWorkspaceDocument,
  putWorkspaceDocument,
} from '../storage/server-workspace-client.js';
import { WORKSPACE_DOMAINS } from '../storage/workspace-domain-registry.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getOrderReviews, loadOrderReviews } from './order-review-store.js';

const STORAGE_KEY_BASE = 'v4:order-reviews';
const WORKSPACE_DOMAIN_CONFIG = WORKSPACE_DOMAINS.ORDER_REVIEWS;
const STORAGE_VERSION = WORKSPACE_DOMAIN_CONFIG.version;
const WORKSPACE_DOMAIN = WORKSPACE_DOMAIN_CONFIG.name;
let restoring = false;
let localMutationVersion = 0;

function getPersistableOrderReviews() {
  return getOrderReviews().filter((order) => order.source !== 'draft' && !order.draft);
}

function normalizePersistedOrderReviews(payload = {}) {
  const orders = Array.isArray(payload?.orderReviews) ? payload.orderReviews : [];
  return orders.filter((order) => order.source !== 'draft' && !order.draft);
}

function buildOrderPayload(instrument = getPrimaryInstrument(), orderReviews = getPersistableOrderReviews()) {
  return {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    instrument,
    orderReviews,
  };
}

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `Order Setup 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveOrderReviews(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  localMutationVersion += 1;
  const payload = buildOrderPayload(instrument);
  const saved = writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), payload, { onError: handleStorageError });
  saveOrderReviewsToServer(instrument, payload);
  return saved;
}

export function restoreOrderReviews(instrument = getPrimaryInstrument(), options = {}) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });

  const orderReviews = normalizePersistedOrderReviews(payload);
  restoring = true;
  try {
    loadOrderReviews(orderReviews);
  } finally {
    restoring = false;
  }

  if (orderReviews.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${orderReviews.length} 条本地 Order Setup`,
      isError: false,
    });
  }
  if (options.syncServer !== false) {
    syncOrderReviewsFromServer(instrument);
  }
}

export function clearSavedOrderReviews() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Order Setup 本地保存已清除', isError: false });
  }
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

function writeLocalOrderPayload(instrument, payload) {
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: Number(payload?.version) || STORAGE_VERSION,
    savedAt: payload?.savedAt || Date.now(),
    instrument,
    orderReviews: normalizePersistedOrderReviews(payload),
  }, { onError: handleStorageError });
}

export function getOrderReviewWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export function getOrderReviewStorageKeyBase() {
  return STORAGE_KEY_BASE;
}

export async function saveOrderReviewsToServer(instrument = getPrimaryInstrument(), payload = null, options = {}) {
  if (restoring) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const nextPayload = payload || buildOrderPayload(normalizedInstrument);
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      version: STORAGE_VERSION,
      payload: {
        ...nextPayload,
        version: Number(nextPayload.version) || STORAGE_VERSION,
        instrument: normalizedInstrument,
        orderReviews: normalizePersistedOrderReviews(nextPayload),
      },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[order-review-persistence] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncOrderReviewsFromServer(instrument = getPrimaryInstrument(), options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedInstrument = String(instrument || getPrimaryInstrument()).trim().toUpperCase();
  const syncToken = localMutationVersion;
  try {
    const document = await getWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      instrument: normalizedInstrument,
      fetchImpl: options.fetchImpl,
    });
    if (document?.found && Array.isArray(document.payload?.orderReviews)) {
      if (localMutationVersion !== syncToken) return { ok: false, skipped: true, stale: true };
      const serverPayload = {
        version: Number(document.payload.version) || STORAGE_VERSION,
        savedAt: document.payload.savedAt || document.savedAt || Date.now(),
        instrument: normalizedInstrument,
        orderReviews: normalizePersistedOrderReviews(document.payload),
      };
      restoring = true;
      try {
        loadOrderReviews(serverPayload.orderReviews);
        writeLocalOrderPayload(normalizedInstrument, serverPayload);
      } finally {
        restoring = false;
      }
      bus.emit('status:update', {
        text: `已恢复 ${serverPayload.orderReviews.length} 条服务器 Order Setup`,
        isError: false,
      });
      return { ok: true, source: 'server', document };
    }

    const localPayload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, normalizedInstrument), null, { onError: handleStorageError });
    const localOrders = normalizePersistedOrderReviews(localPayload);
    if (localOrders.length > 0) {
      const saved = await saveOrderReviewsToServer(normalizedInstrument, buildOrderPayload(normalizedInstrument, localOrders), options);
      return { ok: Boolean(saved?.ok), source: 'local-migration', document: saved };
    }
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[order-review-persistence] server sync failed', error);
    return { ok: false, error };
  }
}

export function initOrderReviewPersistence() {
  restoreOrderReviews();
  bus.on('order-review:changed', () => saveOrderReviews());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveOrderReviews(previousInstrument);
    restoreOrderReviews(instrument);
  });
}
