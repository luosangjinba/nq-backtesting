import assert from 'node:assert/strict';

import {
  hasDailyTimeReviewContent,
  normalizeDailyTimeReview,
} from '../src/time-reaction/daily-time-review-store.js';

const empty = normalizeDailyTimeReview({ date: '2024-01-10' }, { preserveUpdatedAt: true });
assert.equal(empty.bias.weeklyBias, '', 'empty weekly bias defaults to blank');
assert.equal(empty.bias.dailyBias, '', 'empty daily bias defaults to blank');
assert.equal(empty.bias.biasReview, '', 'empty bias review defaults to blank');
assert.equal(empty.openingThesisReview.preOpenThesis, '', 'empty opening thesis defaults to blank');
assert.equal(hasDailyTimeReviewContent(empty), false, 'empty new structures do not count as content');

const legacy = normalizeDailyTimeReview({
  date: '2024-01-10',
  weeklyBias: { note: 'Weekly bullish after reclaim.' },
  dailyBias: { note: 'Daily expects ONH continuation.' },
  pre0930Analysis: { note: '09:29 discount with liquidity above ONH.' },
  summary0930To1100: { note: 'ONH swept and held in morning.' },
  fullDaySummary: { note: 'Full day continued higher.' },
}, { preserveUpdatedAt: true });
assert.equal(legacy.bias.weeklyBias, 'Weekly bullish after reclaim.', 'legacy weekly bias note maps to Bias');
assert.equal(legacy.bias.dailyBias, 'Daily expects ONH continuation.', 'legacy daily bias note maps to Bias');
assert.equal(legacy.openingThesisReview.preOpenThesis, '09:29 discount with liquidity above ONH.', 'legacy pre-0930 note maps to Opening Thesis Review');
assert.equal(legacy.openingThesisReview.morningSummary0930To1100, 'ONH swept and held in morning.', 'legacy morning summary maps to Opening Thesis Review');
assert.equal(legacy.openingThesisReview.fullDaySummary, 'Full day continued higher.', 'legacy full day summary maps to Opening Thesis Review');
assert.equal(hasDailyTimeReviewContent(legacy), true, 'legacy mapped notes count as content');

const direct = normalizeDailyTimeReview({
  date: '2024-01-11',
  bias: {
    weeklyBias: 'Weekly bearish into premium.',
    dailyBias: 'Daily can reject PDH.',
    biasReview: 'Bias was directionally right but early.',
  },
  openingThesisReview: {
    preOpenThesis: 'If ONH sweep fails, expect retrace to FVG.',
    morningSummary0930To1100: 'ONH sweep failed and retraced.',
    fullDaySummary: 'Closed inside prior range.',
    thesisReview: 'Opening thesis matched the morning and enough of the day.',
  },
}, { preserveUpdatedAt: true });
assert.equal(direct.bias.biasReview, 'Bias was directionally right but early.', 'direct bias review persists');
assert.equal(direct.openingThesisReview.thesisReview, 'Opening thesis matched the morning and enough of the day.', 'direct thesis review persists');
assert.equal(hasDailyTimeReviewContent(direct), true, 'direct new structures count as content');

console.log('daily time review store smoke ok');
