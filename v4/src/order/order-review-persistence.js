// Browser-local Order Review draft persistence. This is not the formal research archive.

import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getOrderReviews, loadOrderReviews } from './order-review-store.js';

const STORAGE_KEY_BASE = 'v4:order-reviews';
const STORAGE_VERSION = 1;
let restoring = false;

function getPersistableOrderReviews() {
  return getOrderReviews().filter((order) => order.source !== 'draft' && !order.draft);
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
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    orderReviews: getPersistableOrderReviews(),
  }, { onError: handleStorageError });
}

export function restoreOrderReviews(instrument = getPrimaryInstrument()) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });

  const orderReviews = Array.isArray(payload?.orderReviews) ? payload.orderReviews : [];
  restoring = true;
  try {
    loadOrderReviews(orderReviews.filter((order) => order.source !== 'draft' && !order.draft));
  } finally {
    restoring = false;
  }

  if (orderReviews.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${orderReviews.length} 条本地 Order Setup`,
      isError: false,
    });
  }
}

export function clearSavedOrderReviews() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Order Setup 本地保存已清除', isError: false });
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
