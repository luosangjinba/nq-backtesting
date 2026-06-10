import assert from 'node:assert/strict';

import { buildReviewPayload } from '../src/review/review-archive.js';
import {
  clearDailyTimeReviews,
  getDailyTimeReviewsWithContent,
  loadDailyTimeReviews,
} from '../src/time-reaction/daily-time-review-store.js';
import {
  getDailyTimeReviewStorageKey,
  saveDailyTimeReviews,
} from '../src/time-reaction/daily-time-review-persistence.js';

const memoryStorage = new Map();
globalThis.localStorage = {
  getItem(key) {
    return memoryStorage.has(key) ? memoryStorage.get(key) : null;
  },
  setItem(key, value) {
    memoryStorage.set(key, String(value));
  },
  removeItem(key) {
    memoryStorage.delete(key);
  },
};
globalThis.window = { localStorage: globalThis.localStorage };

clearDailyTimeReviews();
loadDailyTimeReviews([
  {
    date: '2024-01-10',
    instrument: 'NQ',
    bias: {
      weeklyBias: 'Weekly bullish.',
      dailyBias: 'Daily expects ONH continuation.',
      biasReview: 'Bias matched.',
    },
    openingThesisReview: {
      preOpenThesis: '09:30前 discount with liquidity above.',
      morningSummary0930To1100: 'ONH sweep held in morning.',
      fullDaySummary: 'Full day continued higher.',
      thesisReview: 'Opening thesis was useful.',
    },
  },
  {
    date: '2024-01-11',
    instrument: 'NQ',
    bias: {},
    openingThesisReview: {},
  },
], { preserveUpdatedAt: true });

const exportableReviews = getDailyTimeReviewsWithContent();
assert.equal(exportableReviews.length, 1, 'blank new-structure draft is not exportable content');

const payload = buildReviewPayload();
assert.equal(payload.dailyTimeReviews.length, 1, 'Review JSON includes populated Daily Time Review');
assert.equal(payload.dailyTimeReviews[0].bias.biasReview, 'Bias matched.', 'Bias review exports');
assert.equal(payload.dailyTimeReviews[0].openingThesisReview.thesisReview, 'Opening thesis was useful.', 'Opening thesis review exports');

assert.equal(getDailyTimeReviewStorageKey(), 'v4:daily-time-reviews:NQ', 'Daily Time storage key remains stable');
saveDailyTimeReviews();
const saved = JSON.parse(globalThis.localStorage.getItem(getDailyTimeReviewStorageKey()));
assert.equal(saved.dailyTimeReviews.length, 1, 'localStorage excludes blank Daily Time draft');
assert.equal(saved.dailyTimeReviews[0].openingThesisReview.fullDaySummary, 'Full day continued higher.', 'localStorage keeps Opening Thesis Review');

console.log('daily time review archive smoke ok');
