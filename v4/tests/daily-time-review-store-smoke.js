import assert from 'node:assert/strict';

import {
  hasDailyTimeReviewContent,
  normalizeDailyTimeReview,
} from '../src/time-reaction/daily-time-review-store.js';

const empty = normalizeDailyTimeReview({ date: '2024-01-10' }, { preserveUpdatedAt: true });
assert.equal(empty.bias.dailyBiasPrediction, '', 'empty daily bias prediction defaults to blank');
assert.equal(empty.bias.dailyBiasReview, '', 'empty daily bias review defaults to blank');
assert.equal(empty.bias.weeklyBiasPrediction, '', 'empty weekly bias prediction defaults to blank');
assert.equal(empty.bias.weeklyBiasReview, '', 'empty weekly bias review defaults to blank');
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
assert.equal(legacy.bias.weeklyBiasPrediction, 'Weekly bullish after reclaim.', 'legacy weekly bias note maps to weekly prediction');
assert.equal(legacy.bias.dailyBiasPrediction, 'Daily expects ONH continuation.', 'legacy daily bias note maps to daily prediction');
assert.equal(legacy.openingThesisReview.preOpenThesis, '09:29 discount with liquidity above ONH.', 'legacy pre-0930 note maps to Opening Thesis Review');
assert.equal(legacy.openingThesisReview.morningSummary0930To1100, 'ONH swept and held in morning.', 'legacy morning summary maps to Opening Thesis Review');
assert.equal(legacy.openingThesisReview.fullDaySummary, 'Full day continued higher.', 'legacy full day summary maps to Opening Thesis Review');
assert.equal(hasDailyTimeReviewContent(legacy), true, 'legacy mapped notes count as content');

const direct = normalizeDailyTimeReview({
  date: '2024-01-11',
  bias: {
    dailyBiasPrediction: 'Daily can reject PDH.',
    dailyBiasReview: 'Daily bias was directionally right but early.',
    weeklyBiasPrediction: 'Weekly bearish into premium.',
    weeklyBiasReview: 'Weekly bias validated by Friday close.',
  },
  openingThesisReview: {
    preOpenThesis: 'If ONH sweep fails, expect retrace to FVG.',
    morningSummary0930To1100: 'ONH sweep failed and retraced.',
    fullDaySummary: 'Closed inside prior range.',
    thesisReview: 'Opening thesis matched the morning and enough of the day.',
  },
}, { preserveUpdatedAt: true });
assert.equal(direct.bias.dailyBiasReview, 'Daily bias was directionally right but early.', 'direct daily bias review persists');
assert.equal(direct.bias.weeklyBiasReview, 'Weekly bias validated by Friday close.', 'direct weekly bias review persists');
assert.equal(direct.openingThesisReview.thesisReview, 'Opening thesis matched the morning and enough of the day.', 'direct thesis review persists');
assert.equal(hasDailyTimeReviewContent(direct), true, 'direct new structures count as content');

console.log('daily time review store smoke ok');
