// Browser-local Order Review draft persistence. This is not the formal research archive.

import * as bus from '../event-bus.js';
import { getOrderReviews, loadOrderReviews } from './order-review-store.js';

const STORAGE_KEY = 'v4:order-reviews:NQ';
const STORAGE_VERSION = 1;

let restoring = false;

function getPersistableOrderReviews() {
  return getOrderReviews().filter((order) => order.source !== 'draft' && !order.draft);
}

function readPayload() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    bus.emit('status:update', {
      text: `Order Review 本地记录读取失败: ${err.message}`,
      isError: true,
    });
    return null;
  }
}

export function saveOrderReviews() {
  if (restoring) return;

  try {
    const payload = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      orderReviews: getPersistableOrderReviews(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    bus.emit('status:update', {
      text: `Order Review 本地保存失败: ${err.message}`,
      isError: true,
    });
  }
}

export function restoreOrderReviews() {
  const payload = readPayload();
  if (!payload) return;

  const orderReviews = Array.isArray(payload.orderReviews) ? payload.orderReviews : [];
  restoring = true;
  loadOrderReviews(orderReviews.filter((order) => order.source !== 'draft' && !order.draft));
  restoring = false;

  if (orderReviews.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${orderReviews.length} 条本地 Order Review`,
      isError: false,
    });
  }
}

export function clearSavedOrderReviews() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    bus.emit('status:update', { text: 'Order Review 本地保存已清除', isError: false });
  } catch (err) {
    bus.emit('status:update', {
      text: `Order Review 本地保存清除失败: ${err.message}`,
      isError: true,
    });
  }
}

export function initOrderReviewPersistence() {
  restoreOrderReviews();
  bus.on('order-review:changed', saveOrderReviews);
}
