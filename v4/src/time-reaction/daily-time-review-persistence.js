// Browser-local Daily Time Reaction Observation draft persistence.

import * as bus from '../event-bus.js';
import {
  getDailyTimeReviewsWithContent,
  loadDailyTimeReviews,
} from './daily-time-review-store.js';

const STORAGE_KEY = 'v4:daily-time-reviews:NQ';
const STORAGE_VERSION = 1;

let restoring = false;

function readPayload() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    bus.emit('status:update', {
      text: `Time Reaction 本地记录读取失败: ${err.message}`,
      isError: true,
    });
    return null;
  }
}

export function saveDailyTimeReviews() {
  if (restoring) return;
  try {
    const payload = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      dailyTimeReviews: getDailyTimeReviewsWithContent(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    bus.emit('status:update', {
      text: `Time Reaction 本地保存失败: ${err.message}`,
      isError: true,
    });
  }
}

export function restoreDailyTimeReviews() {
  const payload = readPayload();
  if (!payload) return;
  const reviews = Array.isArray(payload.dailyTimeReviews) ? payload.dailyTimeReviews : [];
  restoring = true;
  loadDailyTimeReviews(reviews, { preserveUpdatedAt: true });
  restoring = false;
  if (reviews.length) {
    bus.emit('status:update', {
      text: `已恢复 ${reviews.length} 条本地 Time Reaction Observation`,
      isError: false,
    });
  }
}

export function clearSavedDailyTimeReviews() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    bus.emit('status:update', { text: 'Time Reaction 本地保存已清除', isError: false });
  } catch (err) {
    bus.emit('status:update', {
      text: `Time Reaction 本地保存清除失败: ${err.message}`,
      isError: true,
    });
  }
}

export function initDailyTimeReviewPersistence() {
  restoreDailyTimeReviews();
  bus.on('daily-time-review:changed', saveDailyTimeReviews);
}
