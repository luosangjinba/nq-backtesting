// Browser-local Daily Time Reaction Observation draft persistence.

import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  getDailyTimeReviewsWithContent,
  loadDailyTimeReviews,
} from './daily-time-review-store.js';

const STORAGE_KEY_BASE = 'v4:daily-time-reviews';
const STORAGE_VERSION = 1;
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
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    dailyTimeReviews: getDailyTimeReviewsWithContent(),
  }, { onError: handleStorageError });
}

export function restoreDailyTimeReviews(instrument = getPrimaryInstrument()) {
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
}

export function clearSavedDailyTimeReviews() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Time Reaction 本地保存已清除', isError: false });
  }
}

export function getDailyTimeReviewStorageKey() {
  return getInstrumentStorageKey(STORAGE_KEY_BASE);
}

export function initDailyTimeReviewPersistence() {
  restoreDailyTimeReviews();
  bus.on('daily-time-review:changed', () => saveDailyTimeReviews());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveDailyTimeReviews(previousInstrument);
    restoreDailyTimeReviews(instrument);
  });
}
