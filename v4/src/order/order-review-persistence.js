// Browser-local Order Review draft persistence. This is not the formal research archive.

import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import { getOrderReviews, loadOrderReviews } from './order-review-store.js';

const STORAGE_KEY = 'v4:order-reviews:NQ';
const STORAGE_VERSION = 1;

function getPersistableOrderReviews() {
  return getOrderReviews().filter((order) => order.source !== 'draft' && !order.draft);
}

const persistence = createLocalPersistence({
  key: STORAGE_KEY,
  fallback: null,
  onError(error, action) {
    const label = action === 'read'
      ? '读取'
      : action === 'remove'
        ? '清除'
        : '保存';
    bus.emit('status:update', {
      text: `Order Setup 本地${label}失败: ${error.message}`,
      isError: true,
    });
  },
});

export function saveOrderReviews() {
  persistence.write({
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    orderReviews: getPersistableOrderReviews(),
  });
}

export function restoreOrderReviews() {
  const payload = persistence.read();
  if (!payload) return;

  const orderReviews = Array.isArray(payload.orderReviews) ? payload.orderReviews : [];
  persistence.runRestoring(() => {
    loadOrderReviews(orderReviews.filter((order) => order.source !== 'draft' && !order.draft));
  });

  if (orderReviews.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${orderReviews.length} 条本地 Order Setup`,
      isError: false,
    });
  }
}

export function clearSavedOrderReviews() {
  if (persistence.remove()) {
    bus.emit('status:update', { text: 'Order Setup 本地保存已清除', isError: false });
  }
}

export function initOrderReviewPersistence() {
  restoreOrderReviews();
  bus.on('order-review:changed', saveOrderReviews);
}
