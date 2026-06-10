// Browser-local Daily Time Reaction Observation draft persistence.

import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import {
  getDailyTimeReviewsWithContent,
  loadDailyTimeReviews,
} from './daily-time-review-store.js';

const STORAGE_KEY = 'v4:daily-time-reviews:NQ';
const STORAGE_VERSION = 1;

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
      text: `Time Reaction 本地${label}失败: ${error.message}`,
      isError: true,
    });
  },
});

export function saveDailyTimeReviews() {
  persistence.write({
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    dailyTimeReviews: getDailyTimeReviewsWithContent(),
  });
}

export function restoreDailyTimeReviews() {
  const payload = persistence.read();
  if (!payload) return;
  const reviews = Array.isArray(payload.dailyTimeReviews) ? payload.dailyTimeReviews : [];
  persistence.runRestoring(() => {
    loadDailyTimeReviews(reviews, { preserveUpdatedAt: true });
  });
  if (reviews.length) {
    bus.emit('status:update', {
      text: `已恢复 ${reviews.length} 条本地 Time Reaction Observation`,
      isError: false,
    });
  }
}

export function clearSavedDailyTimeReviews() {
  if (persistence.remove()) {
    bus.emit('status:update', { text: 'Time Reaction 本地保存已清除', isError: false });
  }
}

export function getDailyTimeReviewStorageKey() {
  return STORAGE_KEY;
}

export function initDailyTimeReviewPersistence() {
  restoreDailyTimeReviews();
  bus.on('daily-time-review:changed', saveDailyTimeReviews);
}
